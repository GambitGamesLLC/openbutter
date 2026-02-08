const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();
  
  // Navigate to OpenButter
  await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  // Add test orchestrators
  await page.evaluate(() => {
    const testOrchestrators = [
      {
        id: 'agent:main:main',
        name: 'Chip',
        status: 'online',
        state: 'ready',
        avatar: '🐱‍💻',
        tokenBurn: 232978
      }
    ];
    
    const stored = localStorage.getItem('butter-store') || '{}';
    let parsed = {};
    try {
      parsed = JSON.parse(stored);
    } catch (e) {}
    parsed.orchestrators = testOrchestrators;
    localStorage.setItem('butter-store', JSON.stringify(parsed));
  });
  
  await page.waitForTimeout(500);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  // Click on Chip to select
  const chip = await page.locator('text=Chip').first();
  if (chip) await chip.click();
  await page.waitForTimeout(500);
  
  // Type and send message
  const input = await page.locator('[placeholder="Type a message..."]').first();
  await input.fill('Hello Chip! This is a test message.');
  await page.waitForTimeout(200);
  
  // Click send
  const sendBtn = await page.locator('.send-btn').first();
  await sendBtn.click();
  await page.waitForTimeout(1000);
  
  // Screenshot after sending
  await page.screenshot({ path: 'chat-message-test.png' });
  console.log('Screenshot saved: chat-message-test.png');
  
  await browser.close();
})();
