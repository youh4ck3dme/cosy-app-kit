import { test, expect } from "@playwright/test";

/**
 * Landing redesign smoke (#31) — stable via data-testid + roles.
 * No auth / AI stream.
 */
test.describe("Landing page", () => {
  test("hero, how-it-works, and feature grid render", async ({ page }) => {
    const res = await page.goto("/");
    expect(res).toBeTruthy();
    expect(res!.status()).toBeLessThan(500);

    const hero = page.getByTestId("landing-hero");
    await expect(hero).toBeVisible({ timeout: 20_000 });
    await expect(hero.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(hero.getByRole("link", { name: /open builder/i })).toBeVisible();
    await expect(hero.getByRole("link", { name: /browse templates/i })).toBeVisible();
    // Staggered pricing mock in the decorative canvas
    await expect(hero.getByText("Starter")).toBeVisible();
    await expect(hero.getByText("Pro")).toBeVisible();
    await expect(hero.getByText("Team")).toBeVisible();

    const how = page.getByTestId("landing-how-it-works");
    await expect(how).toBeVisible();
    await expect(how.getByRole("heading", { name: /how it works/i })).toBeVisible();

    const features = page.getByTestId("landing-feature-grid");
    await expect(features).toBeVisible();
    await expect(
      features.getByRole("heading", { name: /everything the canvas already does/i }),
    ).toBeVisible();
  });

  test("landing at 390px has no catastrophic overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.getByTestId("landing-hero")).toBeVisible({ timeout: 20_000 });
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 24);
  });
});
