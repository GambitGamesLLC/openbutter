const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();
  
  // Navigate to OpenButter
  await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });
  
  // Wait a moment for any animations
  await page.waitForTimeout(1000);
  
  // Take screenshot
  await page.screenshot({ 
    path: process.argv[2] || 'openbutter-screenshot.png',
    fullPage: false
  });
  
  console.log('Screenshot saved to:', process.argv[2] || 'openbutter-screenshot.png');
  
  await browser.close();
})();
