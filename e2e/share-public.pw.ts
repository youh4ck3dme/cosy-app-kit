import { test, expect } from "@playwright/test";

test.describe("Public share", () => {
  test("templates index renders", async ({ page }) => {
    await page.goto("/templates");
    await expect(page.getByRole("heading", { name: /templates/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("public artifact missing id shows 404", async ({ page }) => {
    await page.goto("/a/00000000-0000-4000-8000-000000000000");
    await expect(page.getByText("404").first()).toBeVisible({ timeout: 20_000 });
  });
});
