const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Navigate to the BEAT token page
  await page.goto('http://localhost:3000/tokens/56/0xDef1C0ded9bec7F1a1670819833240f027b25Efc');
  
  // Wait for the UI to load
  await page.waitForTimeout(5000);
  
  // Check the quote result
  await page.screenshot({ path: 'C:\\Users\\NZXT\\.gemini\\antigravity\\brain\\73c401b0-27fd-4c41-9cc9-60db1a7ed34b\\test-screenshot.png', fullPage: true });

  await browser.close();
  console.log('Screenshot saved to test-screenshot.png');
})();
