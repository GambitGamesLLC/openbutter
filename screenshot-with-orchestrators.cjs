const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();
  
  // Navigate to OpenButter
  await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });
  
  // Wait for the app to load
  await page.waitForTimeout(2000);
  
  // Add test orchestrators via localStorage
  await page.evaluate(() => {
    const testOrchestrators = [
      {
        id: 'agent:main:main',
        name: 'Chip',
        status: 'online',
        state: 'ready',
        avatar: '🐱‍💻',
        tokenBurn: 232978
      },
      {
        id: 'agent:main:subagent:test1',
        name: 'Code Assistant',
        status: 'busy',
        state: 'thinking',
        avatar: '💻',
        tokenBurn: 45123
      },
      {
        id: 'agent:main:subagent:test2',
        name: 'Web Engineer',
        status: 'error',
        state: 'error',
        avatar: '🌐',
        tokenBurn: 28901
      }
    ];
    
    const stored = localStorage.getItem('butter-store') || '{}';
    let parsed = {};
    try {
      parsed = JSON.parse(stored);
    } catch (e) {}
    parsed.orchestrators = testOrchestrators;
    localStorage.setItem('butter-store', JSON.stringify(parsed));
    
    // Dispatch storage event to trigger UI update
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'butter-store',
      newValue: JSON.stringify(parsed)
    }));
    
    return 'Test orchestrators added';
  });
  
  // Wait for UI to update
  await page.waitForTimeout(1000);
  
  // Reload to apply changes
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  // Take screenshot
  await page.screenshot({ 
    path: process.argv[2] || 'openbutter-with-orchestrators.png',
    fullPage: false
  });
  
  console.log('Screenshot saved to:', process.argv[2] || 'openbutter-with-orchestrators.png');
  
  await browser.close();
})();
