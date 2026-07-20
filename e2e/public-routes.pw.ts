import { test, expect } from "@playwright/test";

/** Well-formed UUID that will never exist as a public artifact. */
const MISSING_PUBLIC_ID = "00000000-0000-4000-8000-000000000001";

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
    test.setTimeout(60_000);
    await page.goto(`/a/${MISSING_PUBLIC_ID}`);
    await expect(page.getByTestId("public-artifact-not-found")).toBeVisible({
      timeout: 25_000,
    });
    await expect(page.getByTestId("public-artifact-not-found")).toContainText("404");
    await expect(page.getByTestId("public-artifact-not-found")).toContainText(
      /not public|does not exist/i,
    );
  });

  test("auth route reachable", async ({ page }) => {
    const res = await page.goto("/auth");
    expect(res).toBeTruthy();
    expect(res!.status()).toBeLessThan(500);
    await expect(page.locator("body")).toBeVisible();
  });
});
