import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StartCrawlRequest, CrawlMode, JobStatus, SelectorMap, CrawlJobResponse, InteractiveOption } from '@repo/shared';
import { chromium, Browser, Page } from 'playwright';
import * as crypto from 'crypto';

interface CrawlSession {
    browser: Browser;
    page: Page;
    lastActivity: number;
}

@Injectable()
export class CrawlerService {
  private readonly logger = new Logger(CrawlerService.name);
  private jobs = new Map<string, CrawlJobResponse>();
  private sessions = new Map<string, CrawlSession>();

  constructor(private prisma: PrismaService) {}

  async startCrawl(dto: StartCrawlRequest): Promise<{ jobId: string; testId: string }> {
    const testSession = await this.prisma.testSession.create({
      data: {
        sourceLoginUrl: dto.loginUrl,
        sourceTestUrl: dto.testUrl || '', 
        status: JobStatus.PENDING,
        includeExplanation: dto.options?.includeExplanation ?? true,
      },
    });

    const job: CrawlJobResponse = {
      jobId: crypto.randomUUID(),
      testId: testSession.id,
      status: JobStatus.RUNNING,
      progress: 0,
      step: 'INIT',
      totalQuestions: 0,
    };
    this.jobs.set(job.jobId, job);

    this.initManualSession(job, dto, testSession.id).catch(err => {
      this.logger.error(`Error in init session ${job.jobId}`, err);
      job.status = JobStatus.FAILED;
      job.errorMessage = err.message;
    });

    return { jobId: job.jobId, testId: testSession.id };
  }

  getJob(jobId: string) {
    return this.jobs.get(jobId) || null;
  }

  async cancelJob(jobId: string) {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = JobStatus.FAILED;
      job.errorMessage = 'Cancelled by user';
      await this.closeBrowserSession(jobId);
    }
  }

  async advanceJob(jobId: string, selectionId: string) {
      const job = this.jobs.get(jobId);
      if (!job) throw new NotFoundException('Job not found');
      // Advance logic might be deprecated in manual flow but kept for compatibility
      return job;
  }

  async scanReviewPage(jobId: string, topic?: string, testName?: string) {
      const job = this.jobs.get(jobId);
      if (!job) throw new NotFoundException('Job not found');
      
      const session = this.sessions.get(jobId);
      if (!session) throw new BadRequestException('Browser session not found');

      // Create a NEW test session so we "clear" the old data for this job
      const oldTestSession = await this.prisma.testSession.findUnique({ where: { id: job.testId! } });
      const newTestSession = await this.prisma.testSession.create({
          data: {
              sourceLoginUrl: oldTestSession!.sourceLoginUrl,
              sourceTestUrl: session.page.url(),
              status: JobStatus.RUNNING,
              topic: topic,
              testName: testName,
              includeExplanation: oldTestSession!.includeExplanation
          }
      });

      // Update the job to point to the new test session
      job.testId = newTestSession.id;
      job.status = JobStatus.RUNNING;
      job.step = 'SCANNING_REVIEW_PAGE';
      job.errorMessage = null;
      job.progress = 0;

      this.processReviewPage(jobId).catch(err => {
          this.logger.error(`Error in scan review ${jobId}`, err);
          job.status = JobStatus.FAILED;
          job.errorMessage = err.message;
          // Not closing browser here to allow retry
      });
      
      return job;
  }

  private async initManualSession(job: CrawlJobResponse, dto: StartCrawlRequest, testSessionId: string) {
      try {
        const browser = await chromium.launch({ headless: false }); 
        const context = await browser.newContext();
        const page = await context.newPage();
        
        // Handle dialogs (alerts, confirms, prompts) by accepting them automatically
        page.on('dialog', async dialog => {
            this.logger.log(`Auto-accepting dialog: ${dialog.message()}`);
            await dialog.accept();
        });
        
        this.sessions.set(job.jobId, { browser, page, lastActivity: Date.now() });

        job.step = 'WAITING_FOR_USER';
        job.status = JobStatus.WAITING_FOR_INPUT; 
        
        try {
            await page.goto(dto.loginUrl, { timeout: 60000 });
            // Attempt auto-login if possible, but don't fail if not
            if (dto.username && dto.password) {
                await this.handleLogin(page, dto.username, dto.password);
            }
        } catch (e) {
            this.logger.warn('Initial navigation failed, but user can manually navigate.');
        }
      } catch (err: any) {
          this.handleError(job, err);
      }
  }

  private async processReviewPage(jobId: string) {
      const session = this.sessions.get(jobId);
      if (!session) throw new Error('Session lost');
      const { page } = session;
      const job = this.jobs.get(jobId)!;

      // User Logic:
      // 1. Click #pills-all-tab
      try {
          await page.click('#pills-all-tab', { timeout: 5000 });
          await page.waitForTimeout(1000); 
      } catch (e) {
          this.logger.warn('Could not click #pills-all-tab. Proceeding assuming list is visible...');
      }

      // 2. Get list from #pills-tabContent a.col-fill
      const questionLinks = await page.evaluate(() => {
          const container = document.getElementById('pills-tabContent');
          if (!container) return [];
          const links = Array.from(container.querySelectorAll('a.col-fill'));
          return links.map(el => el.getAttribute('href')).filter(Boolean);
      });

      this.logger.log(`Found ${questionLinks.length} questions to crawl.`);
      job.totalQuestions = questionLinks.length;
      job.step = 'EXTRACTING_QUESTIONS';

      for (const [index, link] of questionLinks.entries()) {
          const fullUrl = link!.startsWith('http') ? link! : `https://elearning.vnpmi.org${link!}`;
          
          this.logger.log(`Navigating to Q${index + 1}: ${fullUrl}`);
          await page.goto(fullUrl);
          await page.waitForLoadState('domcontentloaded');

          const qData = await this.scrapeQuestionDetail(page);
          this.logger.debug(`Scraped Data Q${index+1}: ${JSON.stringify(qData)}`);
          
          if (qData && qData.questionText && qData.choices.length > 0) {
               try {
                   await this.saveQuestion(job.testId!, index + 1, qData);
                   this.logger.log(`Saved Q${index+1} successfully.`);
               } catch (e) {
                   this.logger.error(`Failed to save Q${index+1}:`, e);
               }
          } else {
              this.logger.warn(`Skipping Q${index+1} - Incomplete data (Text: ${!!qData?.questionText}, Choices: ${qData?.choices?.length || 0})`);
          }
          
          job.progress = Math.floor(((index + 1) / questionLinks.length) * 90) + 5;
          await page.waitForTimeout(500); 
      }

      // loops back to waiting state so user can navigate to next page and crawl again
      job.status = JobStatus.WAITING_FOR_INPUT;
      job.step = 'WAITING_FOR_USER';
      job.progress = 100; // Visual completion of this batch
      this.logger.log(`Batch finished. Session kept open for more crawling.`);
      // await this.closeBrowserSession(jobId); // REMOVED to keep browser open
  }

  private async scrapeQuestionDetail(page: Page) {
       return page.evaluate(() => {
           let questionText = '';
           const headers = Array.from(document.querySelectorAll('h3, h4, .card-title, strong, b'));
           const stepHeader = headers.find(el => (el as HTMLElement).innerText.includes('Step by Step'));
           
           if (stepHeader) {
               const cardBody = stepHeader.closest('.card, .panel, .box')?.querySelector('.card-body, .panel-body, .box-body');
               if (cardBody) {
                   questionText = (cardBody as HTMLElement).innerText.replace('Step by Step', '').trim();
               } else {
                   let sibling = stepHeader.nextElementSibling;
                   while (sibling) {
                       if (sibling.tagName === 'P' || sibling.tagName === 'DIV') {
                           questionText += (sibling as HTMLElement).innerText + '\n';
                       }
                       sibling = sibling.nextElementSibling;
                   }
               }
           }
           
           if (!questionText) {
               const qTextEl = document.querySelector('.question-content, .card-body h4, .q-text');
               if (qTextEl) {
                   questionText = (qTextEl as HTMLElement).innerText.trim();
               } else {
                    questionText = document.body.innerText; 
               }
           }

           let choices = Array.from(document.querySelectorAll('.answer-option, .radio, .checkbox, label')).map(el => {
               const input = el.querySelector('input[type="radio"], input[type="checkbox"]');
               if (!input) return null;
               
               const text = (el as HTMLElement).innerText.trim();
               
               // Check existing heuristics (green text)
               let isCorrect = el.classList.contains('text-success') || el.querySelector('.text-success') !== null || (el as HTMLElement).style.color === 'green' || (el as HTMLElement).style.color === 'rgb(0, 128, 0)';
               
               // Check for Checked attribute (common in this user's platform for correct answer key)
               if (!isCorrect && (input as HTMLInputElement).checked) {
                   isCorrect = true;
               }

               // Check for specific class 'radio-danger' which user identified as the 'R' (Right?) marker
               // The user wants the 'R' style. We can assume 'radio-danger' + checked = The marked answer.
               if (el.classList.contains('radio-danger')) {
                   // Double check if it's checked, usually it is.
                   if ((input as HTMLInputElement).checked) isCorrect = true;
               }

               return { text, isCorrect: !!isCorrect, label: '' };
           }).filter(Boolean);

           // Fallback for choices if standard selectors fail
           if (choices.length === 0) {
                const inputs = Array.from(document.querySelectorAll('input[type="radio"], input[type="checkbox"]'));
                choices = inputs.map(input => {
                    const container = input.closest('div, li, tr') || input.parentElement;
                    if (!container) return null;
                    const text = (container as HTMLElement).innerText.trim();
                    
                    let isCorrect = container.classList.contains('text-success') || container.querySelector('.text-success') !== null || (container as HTMLElement).style.color === 'green';
                    if (!isCorrect && (input as HTMLInputElement).checked) isCorrect = true;

                    return { text, isCorrect: !!isCorrect, label: '' };
                }).filter(Boolean);
           }

           let explanation = '';
           const noteHeader = headers.find(el => (el as HTMLElement).innerText.includes('Note:'));
           if (noteHeader) {
                const container = noteHeader.closest('div, p');
                explanation = container ? (container as HTMLElement).innerText.replace('Note:', '').trim() : '';
           }

           return { questionText: questionText.trim(), choices, explanation };
       });
  }

  private async saveQuestion(testSessionId: string, index: number, data: any) {
       const hash = crypto.createHash('md5').update(data.questionText).digest('hex');
        
        await this.prisma.question.create({
            data: {
                testSessionId,
                indexNumber: index,
                questionText: data.questionText.substring(0, 5000), // Limit length just in case
                explanation: data.explanation ? data.explanation.substring(0, 5000) : '',
                hash,
                choices: {
                    create: (data.choices || []).map((c: any) => ({
                        text: c.text,
                        isCorrect: c.isCorrect,
                        label: c.label || ''
                    }))
                }
            }
        });
  }

  // Renamed from cleanupSession to be more specific. 
  // ONLY closes the browser. Does NOT remove the job from memory.
  private async closeBrowserSession(jobId: string) {
      const session = this.sessions.get(jobId);
      if (session) {
          try {
            await session.browser.close();
          } catch(e) {}
          this.sessions.delete(jobId);
      }
      // We do NOT delete the job from this.jobs here anymore.
      // This allows the frontend to query the job status and see "DONE".
  }

  async cleanupJob(jobId: string) {
      await this.closeBrowserSession(jobId);
      this.jobs.delete(jobId);
  }

  private handleError(job: CrawlJobResponse, err: any) {
      this.logger.error(err);
      job.status = JobStatus.FAILED;
      job.errorMessage = err.message;
      this.closeBrowserSession(job.jobId);
  }

  private async handleLogin(page: Page, user: string, pass: string) {
    try {
        this.logger.log(`Attempting login for user: ${user}`);
        await page.fill('input[type="email"], input[name*="user"], input[placeholder*="mail"]', user);
        await page.fill('input[type="password"]', pass);
        
        const loginBtnSelector = 'button[type="submit"], input[type="submit"], button:has-text("Log")';
        await page.click(loginBtnSelector);

        try {
            const result = await Promise.race([
                page.waitForNavigation({ timeout: 10000 }).then(() => 'navigated'),
                page.waitForSelector('text="logged in on another device"', { timeout: 5000 }).then(() => 'conflict'),
                page.waitForSelector('.alert-danger, .error-message', { timeout: 5000 }).then(() => 'error')
            ]);
            
            if (result === 'conflict') {
                this.logger.warn('Session conflict detected. Forcing login...');
                await page.waitForTimeout(1000); 
                await page.click(loginBtnSelector); 
                await page.waitForNavigation({ timeout: 15000 });
            } 
        } catch (e) {
            // ignore
        }
    } catch (e) {
        this.logger.warn('Login heuristic failed, continuing anyway...', e);
    }
  }
}
