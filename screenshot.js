const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto('http://localhost:3000/preview/menu', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'menu_preview_screenshot.png' });
    console.log("Screenshot taken successfully: menu_preview_screenshot.png");
  } catch (error) {
    console.error("Error taking screenshot:", error);
  } finally {
    await browser.close();
  }
})();
