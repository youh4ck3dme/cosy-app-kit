import { test, expect } from "@playwright/test";

/**
 * Mobile viewport shell checks (MR-40).
 * Prefer public pages — auth-gated chat is soft-pass.
 */
const PHONE_VIEWPORTS = [
  { name: "iPhone 17 Air", width: 420, height: 912 },
  { name: "iPhone 15", width: 393, height: 852 },
  { name: "generic mobile", width: 390, height: 844 },
] as const;

for (const vp of PHONE_VIEWPORTS) {
  test.describe(`Mobile shell · ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("templates: no catastrophic document overflow", async ({ page }) => {
      await page.goto("/templates");
      await expect(page.getByRole("heading", { name: /templates/i })).toBeVisible({
        timeout: 20_000,
      });
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 24);
    });

    test("chat entry: auth or app shell loads", async ({ page }) => {
      const res = await page.goto("/chat");
      expect(res).toBeTruthy();
      expect(res!.status()).toBeLessThan(500);
      await expect(page.locator("body")).toBeVisible();
    });
  });
}
