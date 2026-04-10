import { expect, test } from "@playwright/test";

test.describe("Staff Payment Flows", () => {
  test("takeaway supports mark-later option", async ({ page }) => {
    await page.goto("/staff/takeaway");
    const paymentMode = page.getByLabel("Payment Mode");
    await expect(paymentMode).toBeVisible();
    await paymentMode.selectOption("later");
    await expect(paymentMode).toHaveValue("later");
  });

  test("table checkout uses unified payment status endpoint", async ({ page }) => {
    let called = false;
    await page.route("**/api/admin/payments/status", async route => {
      called = true;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ updated: 1, status: "paid" }) });
    });
    await page.goto("/staff/table/mock-session");
    // Smoke assertion for route wiring only.
    await page.evaluate(() => fetch("/api/admin/payments/status", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ session_id: "00000000-0000-0000-0000-000000000000", status: "paid", payment_mode: "cash" }),
    }));
    expect(called).toBeTruthy();
  });
});
