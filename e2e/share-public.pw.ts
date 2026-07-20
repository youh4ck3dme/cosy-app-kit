import { test, expect } from "@playwright/test";

const MISSING_PUBLIC_ID = "00000000-0000-4000-8000-000000000001";

test.describe("Public share", () => {
  test("templates index renders", async ({ page }) => {
    await page.goto("/templates");
    await expect(page.getByRole("heading", { name: /templates/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("public artifact missing id shows 404", async ({ page }) => {
    // Cold Vite + parallel workers: allow slow first /a/:id paint.
    test.setTimeout(60_000);
    await page.goto(`/a/${MISSING_PUBLIC_ID}`);
    await expect(page.getByTestId("public-artifact-not-found")).toBeVisible({
      timeout: 25_000,
    });
    await expect(page.getByTestId("public-artifact-not-found")).toContainText("404");
  });
});
