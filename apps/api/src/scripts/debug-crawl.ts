
import { chromium } from 'playwright';

async function debugCrawl() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Browser launched.');
  console.log('PLEASE LOG IN MANUALLY IN THE BROWSER WINDOW.');
  console.log('After logging in, navigate to a specific QUESTION DETAIL page (e.g. https://elearning.vnpmi.org/Customers/viewDetailQuestion/...).');
  console.log('Type "run" in this terminal when you are on the question page to run the scraper debug.');

  process.stdin.on('data', async (data) => {
    const input = data.toString().trim();
    if (input === 'run') {
      console.log('Running scraper...');
      try {
        const result = await page.evaluate(() => {
          // --- PASTE SCRAPER LOGIC HERE ---
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
                questionText = qTextEl ? (qTextEl as HTMLElement).innerText.trim() : document.body.innerText;
            }

            let choices = Array.from(document.querySelectorAll('.answer-option, .radio, .checkbox, label')).map(el => {
                const input = el.querySelector('input[type="radio"], input[type="checkbox"]');
                if (!input) return null;
                
                const text = (el as HTMLElement).innerText.trim();
                const isCorrect = el.classList.contains('text-success') || el.querySelector('.text-success') !== null || (el as HTMLElement).style.color === 'green' || (el as HTMLElement).style.color === 'rgb(0, 128, 0)';
                
                return { text, isCorrect: !!isCorrect, label: '' };
            }).filter(Boolean);

             // Fallback for choices if standard selectors fail
           if (choices.length === 0) {
                const inputs = Array.from(document.querySelectorAll('input[type="radio"], input[type="checkbox"]'));
                choices = inputs.map(input => {
                    const container = input.closest('div, li, tr') || input.parentElement;
                    if (!container) return null;
                    const text = (container as HTMLElement).innerText.trim();
                    const isCorrect = container.classList.contains('text-success') || container.querySelector('.text-success') !== null || (container as HTMLElement).style.color === 'green';
                    return { text, isCorrect: !!isCorrect, label: '' };
                }).filter(Boolean);
           }

            let explanation = '';
            const noteHeader = headers.find(el => (el as HTMLElement).innerText.includes('Note:'));
            if (noteHeader) {
                 const container = noteHeader.closest('div, p');
                 explanation = container ? (container as HTMLElement).innerText.replace('Note:', '').trim() : '';
            }

            return { questionText: questionText?.substring(0, 100) + '...', choicesCount: choices.length, choices, explanation };
          // --- END SCRAPER LOGIC ---
        });

        console.log('SCRAPER RESULT:', JSON.stringify(result, null, 2));
        
        if (result.choicesCount === 0) {
            console.log('WARNING: No choices found. Dumping inputs found on page:');
            const inputs = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('input')).map(i => ({ type: i.type, id: i.id, name: i.name, parentHTML: i.parentElement?.outerHTML.substring(0, 100) }));
            });
            console.log(inputs);
        }

      } catch (err) {
        console.error('Error running scraper:', err);
      }
    }
    
    if (input === 'exit') {
        await browser.close();
        process.exit(0);
    }
  });
}

debugCrawl();
