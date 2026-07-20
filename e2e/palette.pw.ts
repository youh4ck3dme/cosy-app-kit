import { test, expect } from "@playwright/test";

/**
 * Local-only e2e (Cursor phase L). Not wired into GitHub CI.
 * Run: bunx playwright test  (requires @playwright/test + browsers)
 */

test.describe("Command palette", () => {
  test("Cmd+K opens and Esc closes when authenticated shell is available", async ({
    page,
  }) => {
    await page.goto("/chat");
    // Unauth may land on /auth — soft assert either palette or sign-in
    const onAuth = page.url().includes("/auth");
    if (onAuth) {
      await expect(page.getByRole("heading", { name: /sign in|builder/i }).first()).toBeVisible({
        timeout: 15_000,
      });
      return;
    }
    await page.keyboard.press("Meta+K");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 }).catch(async () => {
      await page.keyboard.press("Control+K");
      await expect(dialog).toBeVisible({ timeout: 5000 });
    });
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden({ timeout: 5000 });
  });
});
