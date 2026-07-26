import { test, expect } from "@playwright/test";

/**
 * Speed & PWA shell checks across iPhone 17 Air and other QA viewports.
 * Auth-gated settings are soft-pass; public routes must not overflow.
 */
const QA_VIEWPORTS = [
  { name: "iPhone 17 Air", width: 420, height: 912 },
  { name: "iPhone 17 Pro", width: 402, height: 874 },
  { name: "iPhone 15", width: 393, height: 852 },
  { name: "iPhone SE", width: 375, height: 667 },
  { name: "iPad Air", width: 820, height: 1180 },
  { name: "Desktop", width: 1280, height: 800 },
] as const;

for (const vp of QA_VIEWPORTS) {
  test.describe(`${vp.name} (${vp.width}×${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("templates: no horizontal document overflow", async ({ page }) => {
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

    test("auth: shell loads with PWA viewport meta", async ({ page }) => {
      const res = await page.goto("/auth");
      expect(res).toBeTruthy();
      expect(res!.status()).toBeLessThan(500);
      const content = await page.content();
      expect(content).toContain("viewport-fit=cover");
    });

    test("chat entry: app or auth gate loads", async ({ page }) => {
      const res = await page.goto("/chat");
      expect(res).toBeTruthy();
      expect(res!.status()).toBeLessThan(500);
      await expect(page.locator("body")).toBeVisible();
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 32);
    });
  });
}

test.describe("iPhone 17 Air — PWA static assets", () => {
  test.use({ viewport: { width: 420, height: 912 } });

  test("manifest and offline shell reachable", async ({ request }) => {
    const base = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:8080";
    const manifest = await request.get(`${base}/manifest.webmanifest`);
    expect(manifest.ok()).toBe(true);
    const json = (await manifest.json()) as { id?: string; display?: string };
    expect(json.id).toBe("/");
    expect(json.display).toBe("standalone");

    const offline = await request.get(`${base}/offline.html`);
    expect(offline.ok()).toBe(true);
  });
});
