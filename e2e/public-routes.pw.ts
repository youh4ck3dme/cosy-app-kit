import { test, expect } from "@playwright/test";

/**
 * Public / unauth routes — stable without Mistral or login.
 */
test.describe("Public routes", () => {
  test("landing responds", async ({ page }) => {
    const res = await page.goto("/");
    expect(res).toBeTruthy();
    expect(res!.status()).toBeLessThan(500);
    await expect(page.locator("body")).toBeVisible();
  });

  test("templates index", async ({ page }) => {
    await page.goto("/templates");
    await expect(page.getByRole("heading", { name: /templates/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("unknown public artifact shows 404 chrome", async ({ page }) => {
    await page.goto("/a/00000000-0000-4000-8000-000000000000");
    await expect(page.getByText("404").first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/isn't public|doesn['’]t exist/i).first()).toBeVisible({
      timeout: 5_000,
    });
  });

  test("auth route reachable", async ({ page }) => {
    const res = await page.goto("/auth");
    expect(res).toBeTruthy();
    expect(res!.status()).toBeLessThan(500);
    await expect(page.locator("body")).toBeVisible();
  });
});
