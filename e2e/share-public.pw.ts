import { test, expect } from "@playwright/test";

test.describe("Public share", () => {
  test("templates index renders", async ({ page }) => {
    await page.goto("/templates");
    await expect(page.getByRole("heading", { name: "Templates" })).toBeVisible();
  });

  test("public artifact route soft-checks 200 or 404 chrome", async ({ page }) => {
    // No fixture id guaranteed — hit a fake uuid and expect 404 chrome
    await page.goto("/a/00000000-0000-4000-8000-000000000000");
    await expect(page.getByText(/isn't public|doesn’t exist|doesn't exist|404/i)).toBeVisible({
      timeout: 15_000,
    });
  });
});
