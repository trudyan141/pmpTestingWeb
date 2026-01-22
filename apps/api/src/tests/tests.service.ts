import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { chromium } from 'playwright';

@Injectable()
export class TestsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.testSession.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { questions: true } }
      }
    });
  }

  async findOne(id: string) {
    return this.prisma.testSession.findUnique({
      where: { id },
      include: { 
        questions: { 
          include: { choices: true },
          orderBy: { indexNumber: 'asc' }
        } 
      },
    });
  }

  async getQuestions(id: string) {
    return this.prisma.question.findMany({
      where: { testSessionId: id },
      include: { choices: true },
      orderBy: { indexNumber: 'asc' },
    });
  }

  async exportJson(id: string) {
    return this.findOne(id);
  }

  async generatePdf(id: string, includeExplanation: boolean, onlyCorrect: boolean) {
    const test = await this.prisma.testSession.findUnique({
      where: { id },
      include: { 
        questions: { 
          include: { choices: true },
          orderBy: { indexNumber: 'asc' } // Ensure correct order
        } 
      },
    });

    if (!test) throw new Error('Test not found');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
          body { 
            font-family: 'Inter', sans-serif; 
            padding: 40px; 
            background-color: white; 
            color: black;
            line-height: 1.5;
          }
          .header { 
            border-bottom: 2px solid #eee;
            margin-bottom: 30px;
            padding-bottom: 20px;
          }
          .title { 
            font-size: 28px; 
            font-weight: 800; 
            margin-bottom: 5px;
          }
          .subtitle {
            font-size: 18px;
            color: #444;
            margin-bottom: 15px;
            font-weight: 600;
          }
          .metadata {
            color: #666;
            font-size: 12px;
          }
          .question-card { 
            break-inside: avoid; 
            margin-bottom: 40px; 
            border-top: 1px solid #eee;
            padding-top: 20px;
          }
          .question-header { 
            font-weight: 700; 
            margin-bottom: 12px; 
            font-size: 16px;
            color: #000;
          }
          .question-text { 
            margin-bottom: 20px; 
            white-space: pre-wrap;
            color: #333;
          }
          .choices {
            margin-left: 5px;
          }
          .choice { 
            margin: 8px 0; 
            padding: 4px 0;
            display: flex;
            align-items: flex-start;
            gap: 10px;
          }
          .choice-indicator {
            flex-shrink: 0;
            width: 14px;
            height: 14px;
            border: 1px solid #ccc;
            border-radius: 50%;
            margin-top: 3px;
          }
          .correct { 
            font-weight: 800; 
            color: #000;
          }
          .correct .choice-indicator {
            background-color: #000;
            border-color: #000;
            position: relative;
          }
          .correct .choice-indicator::after {
            content: '✓';
            color: white;
            font-size: 10px;
            position: absolute;
            top: -1px;
            left: 2px;
          }
          .explanation { 
            margin-top: 15px; 
            padding: 12px; 
            background: #f9f9f9; 
            font-size: 13px; 
            border-radius: 4px;
            border-left: 3px solid #ddd;
            color: #555;
          }
          .explanation-title {
            font-weight: 700;
            color: #333;
            margin-right: 5px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Test Portfolio</div>
          <div class="subtitle">
            ${test.testName || 'Untitled Test'}${test.topic ? ` - ${test.topic}` : ''}
          </div>
          <div class="metadata">
            Source: ${test.sourceTestUrl || 'Manual Session'}<br/>
            Total Questions: ${test.questions.length} • Date: ${new Date(test.createdAt).toLocaleDateString()}
          </div>
        </div>
        
        ${test.questions.map((q) => `
          <div class="question-card">
            <div class="question-header">Question ${q.indexNumber}</div>
            <div class="question-text">${q.questionText}</div>
            
            <div class="choices">
                ${q.choices.map(c => {
                    const isCorrect = c.isCorrect;
                    return `
                      <div class="choice ${isCorrect ? 'correct' : ''}">
                        <div class="choice-indicator"></div>
                        <span>${c.text}</span>
                      </div>
                    `;
                }).join('')}
            </div>

            ${includeExplanation && q.explanation ? `
              <div class="explanation">
                <span class="explanation-title">Explanation:</span>
                ${q.explanation}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </body>
      </html>
    `;

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(htmlContent);
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
    });
    
    await browser.close();
    return pdf;
  }
}
