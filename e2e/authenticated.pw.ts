import { test, expect, type Page } from "@playwright/test";

/**
 * Authenticated workspace flow. Runs ONLY when real test credentials are
 * provided — otherwise every test is skipped (safe for CI and local runs):
 *
 *   E2E_EMAIL=test@example.com E2E_PASSWORD=... bun run test:e2e
 *
 * Use a dedicated throwaway account: the suite signs in with email+password
 * on /auth and walks chat → palette → new thread. It never sends an AI
 * message (streams are slow/flaky and burn credits).
 */
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
const hasCreds = Boolean(EMAIL && PASSWORD);

async function signIn(page: Page) {
  await page.goto("/auth");
  await page.waitForLoadState("domcontentloaded");
  await page.getByPlaceholder(/you@/i).fill(EMAIL!);
  await page.getByPlaceholder(/password/i).fill(PASSWORD!);
  await page.getByRole("button", { name: /sign in/i }).click();
  // Successful auth leaves /auth (chat index or last thread).
  await page.waitForURL((url) => !url.pathname.startsWith("/auth"), { timeout: 30_000 });
}

test.describe("Authenticated workspace", () => {
  test.skip(!hasCreds, "E2E_EMAIL / E2E_PASSWORD not set — skipping authenticated flow");

  test("signs in and lands in the chat workspace", async ({ page }) => {
    await signIn(page);
    await page.goto("/chat");
    // The composer is the workspace's anchor element.
    await expect(page.getByRole("textbox").first()).toBeVisible({ timeout: 30_000 });
  });

  test("command palette opens, filters, and closes", async ({ page }) => {
    await signIn(page);
    await page.goto("/chat");
    await expect(page.getByRole("textbox").first()).toBeVisible({ timeout: 30_000 });

    await page.keyboard.press("ControlOrMeta+K");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden({ timeout: 5_000 });
  });

  test("theme toggle flips the dark class and persists", async ({ page }) => {
    await signIn(page);
    await page.goto("/chat");
    await expect(page.getByRole("textbox").first()).toBeVisible({ timeout: 30_000 });

    const isDark = () => page.evaluate(() => document.documentElement.classList.contains("dark"));
    const toggle = page.getByRole("button", { name: /^Theme:/ }).first();
    if (!(await toggle.isVisible().catch(() => false))) {
      test.skip(true, "Theme toggle not visible in this viewport");
    }

    const before = await isDark();
    // Cycle at most 3 times (system → light → dark) until the class flips.
    let flipped = false;
    for (let i = 0; i < 3 && !flipped; i++) {
      await toggle.click();
      flipped = (await isDark()) !== before;
    }
    expect(flipped).toBe(true);

    // Explicit choice must survive a reload (localStorage + bootstrap script).
    const chosen = await isDark();
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    expect(await isDark()).toBe(chosen);
  });
});
