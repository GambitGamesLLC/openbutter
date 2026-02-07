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
    
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'butter-store',
      newValue: JSON.stringify(parsed)
    }));
    
    return 'Test orchestrator added';
  });
  
  await page.waitForTimeout(1000);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  // Click on Chip to select
  const chipElement = await page.locator('.orchestrator-item:has-text("Chip")').first();
  if (chipElement) {
    await chipElement.click();
    await page.waitForTimeout(500);
  }
  
  // Type a message
  const input = await page.locator('.message-input').first();
  await input.fill('Hello Chip! Can you help me check system health?');
  await page.waitForTimeout(500);
  
  // Take screenshot before sending
  await page.screenshot({ path: 'chat-before-send.png' });
  console.log('Screenshot before send: chat-before-send.png');
  
  // Click send button
  const sendButton = await page.locator('.send-btn').first();
  await sendButton.click();
  await page.waitForTimeout(1000);
  
  // Take screenshot after sending
  await page.screenshot({ path: 'chat-after-send.png' });
  console.log('Screenshot after send: chat-after-send.png');
  
  // Wait a moment for any response
  await page.waitForTimeout(3000);
  
  // Take final screenshot
  await page.screenshot({ path: 'chat-final.png' });
  console.log('Final screenshot: chat-final.png');
  
  await browser.close();
})();
