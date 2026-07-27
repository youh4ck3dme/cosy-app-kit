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
  // Bridging shell ("Completing sign-in…") can last until OAuth/session bootstrap
  // or the 12s fail-open timer in auth.tsx — wait for the real form.
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

  test.beforeEach(async ({ page }) => {
    // Avoid sticky Supabase/OAuth session leaving /auth on AuthPendingShell forever in workers.
    await page.context().clearCookies();
    await page.goto("/auth");
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {
        /* ignore */
      }
    });
  });

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

/** Always runs — probes /auth selectors without credentials. */
test("auth page exposes sign-in testid (no secrets)", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/auth");
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
  });
  await page.reload();
  await page.waitForLoadState("domcontentloaded");
  // Must outlast auth.tsx BRIDGE_TIMEOUT_MS (12s) fail-open when session probe hangs.
  await expect(page.getByTestId("auth-sign-in")).toBeVisible({ timeout: 20_000 });
  const emailCount = await page.getByPlaceholder(/you@/i).count();
  const passwordCount = await page.getByPlaceholder(/password/i).count();
  expect(emailCount).toBeGreaterThan(0);
  expect(passwordCount).toBeGreaterThan(0);
});
