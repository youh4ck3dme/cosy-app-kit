import { test, expect } from "@playwright/test";

/**
 * Mobile viewport shell checks (MR-40).
 * Prefer public pages — auth-gated chat is soft-pass.
 */
test.describe("Mobile shell", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("templates at 390: no catastrophic document overflow", async ({ page }) => {
    await page.goto("/templates");
    await expect(page.getByRole("heading", { name: /templates/i })).toBeVisible({
      timeout: 20_000,
    });
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    // Allow modest scrollbar / safe-area slack
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 24);
  });

  test("chat entry at 390: auth or app shell loads", async ({ page }) => {
    const res = await page.goto("/chat");
    expect(res).toBeTruthy();
    expect(res!.status()).toBeLessThan(500);
    await expect(page.locator("body")).toBeVisible();
  });
});
