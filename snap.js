const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  try {
    await page.goto('http://localhost:3000/staff', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'staff_snap.png' });
    console.log("Screenshot taken successfully: staff_snap.png");
    
    await page.goto('http://localhost:3000/staff/menu', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'menu_snap.png' });
    console.log("Screenshot taken successfully: menu_snap.png");
    
    await page.goto('http://localhost:3000/menu', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'customer_menu_snap.png' });
    console.log("Screenshot taken successfully: customer_menu_snap.png");
  } catch (error) {
    console.error("Error taking screenshot:", error);
  } finally {
    await browser.close();
  }
})();
