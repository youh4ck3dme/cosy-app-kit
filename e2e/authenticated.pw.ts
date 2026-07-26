import { test, expect, type Page } from "@playwright/test";

/**
 * Authenticated workspace. Runs ONLY with credentials:
 *
 *   E2E_EMAIL=… E2E_PASSWORD=… bun run test:e2e -- e2e/authenticated.pw.ts
 *
 * Never sends AI messages.
 */
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
const hasCreds = Boolean(EMAIL && PASSWORD);

async function signIn(page: Page) {
  await page.goto("/auth");
  await page.waitForLoadState("domcontentloaded");
  await expect(page.getByTestId("auth-sign-in")).toBeVisible({ timeout: 25_000 });
  await page.getByPlaceholder(/you@/i).fill(EMAIL!);
  await page.getByPlaceholder(/password/i).fill(PASSWORD!);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/auth"), { timeout: 30_000 });
}

async function openChatWorkspace(page: Page) {
  await page.goto("/chat");
  await expect(page.getByTestId("chat-composer")).toBeVisible({ timeout: 40_000 });
}

test.describe("Authenticated workspace", () => {
  test.skip(!hasCreds, "E2E_EMAIL / E2E_PASSWORD not set — skipping authenticated flow");

  test("signs in and lands in the chat workspace", async ({ page }) => {
    await signIn(page);
    await openChatWorkspace(page);
    await expect(page).toHaveURL(/\/chat(\/|$)/);
    await expect(page.getByTestId("chat-preview-toggle")).toBeVisible();
  });

  test("command palette opens and closes", async ({ page }) => {
    await signIn(page);
    await openChatWorkspace(page);
    await page.keyboard.press("ControlOrMeta+K");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden({ timeout: 5_000 });
  });

  test("theme toggle flips the dark class and persists", async ({ page }) => {
    await signIn(page);
    await openChatWorkspace(page);
    const isDark = () => page.evaluate(() => document.documentElement.classList.contains("dark"));
    const toggle = page.getByRole("button", { name: /theme:/i }).first();
    if (!(await toggle.isVisible().catch(() => false))) {
      test.skip(true, "Theme toggle not visible in this viewport");
    }
    const before = await isDark();
    let flipped = false;
    for (let i = 0; i < 3 && !flipped; i++) {
      await toggle.click();
      await page.waitForTimeout(250);
      flipped = (await isDark()) !== before;
    }
    expect(flipped).toBe(true);
    const chosen = await isDark();
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    expect(await isDark()).toBe(chosen);
  });

  test("Chat|Preview switch shows canvas", async ({ page }) => {
    await signIn(page);
    await openChatWorkspace(page);
    await expect(page.getByTestId("chat-preview-toggle")).toBeVisible();
    await page.getByRole("button", { name: /show preview canvas/i }).click();
    await expect(page.getByRole("button", { name: /show preview canvas/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByTestId("builder-canvas")).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: /show chat view/i }).click();
    await expect(page.getByRole("button", { name: /show chat view/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
