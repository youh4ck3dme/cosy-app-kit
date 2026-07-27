import { test, expect, type Page } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

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

// #region agent log
function debugLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>,
) {
  const payload = {
    sessionId: "5d5b64",
    runId: process.env.E2E_DEBUG_RUN ?? "auth-e2e-pre",
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  };
  fetch("http://127.0.0.1:7902/ingest/0243bef4-d50a-482b-b552-d96902be1642", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "5d5b64" },
    body: JSON.stringify(payload),
  }).catch(() => undefined);
}
(() => {
  const envLocal = resolve(process.cwd(), ".env.local");
  const envFile = resolve(process.cwd(), ".env");
  const readKeys = (p: string) => {
    if (!existsSync(p)) return { exists: false, hasEmailKey: false, hasPasswordKey: false };
    const raw = readFileSync(p, "utf8");
    return {
      exists: true,
      hasEmailKey: /^E2E_EMAIL=/m.test(raw),
      hasPasswordKey: /^E2E_PASSWORD=/m.test(raw),
    };
  };
  debugLog("H1", "authenticated.pw.ts:module", "creds gate", {
    hasCreds,
    emailSet: Boolean(EMAIL),
    passwordSet: Boolean(PASSWORD),
    emailLen: EMAIL?.length ?? 0,
    passwordLen: PASSWORD?.length ?? 0,
  });
  debugLog("H2", "authenticated.pw.ts:module", "dotenv file keys (no values)", {
    envLocal: readKeys(envLocal),
    env: readKeys(envFile),
    playwrightLoadsDotenv: false,
  });
})();
// #endregion

async function signIn(page: Page) {
  await page.goto("/auth");
  await page.waitForLoadState("domcontentloaded");
  // Bridging shell ("Completing sign-in…") can last until OAuth/session bootstrap
  // or the 12s fail-open timer in auth.tsx — wait for the real form.
  await expect(page.getByTestId("auth-sign-in")).toBeVisible({ timeout: 25_000 });
  // #region agent log
  const youPlaceholder = await page.getByPlaceholder(/you@/i).count();
  debugLog("H3", "authenticated.pw.ts:signIn", "auth form ready", {
    path: new URL(page.url()).pathname,
    youPlaceholderCount: youPlaceholder,
  });
  // #endregion
  await page.getByPlaceholder(/you@/i).fill(EMAIL!);
  await page.getByPlaceholder(/password/i).fill(PASSWORD!);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/auth"), { timeout: 30_000 });
  // #region agent log
  debugLog("H4", "authenticated.pw.ts:signIn", "after sign-in navigation", {
    path: new URL(page.url()).pathname,
  });
  // #endregion
}

async function openChatWorkspace(page: Page) {
  await page.goto("/chat");
  // #region agent log
  const composerVisible = await page
    .getByTestId("chat-composer")
    .isVisible()
    .catch(() => false);
  const previewToggle = await page
    .getByTestId("chat-preview-toggle")
    .isVisible()
    .catch(() => false);
  debugLog("H4", "authenticated.pw.ts:openChatWorkspace", "chat shell", {
    path: new URL(page.url()).pathname,
    composerVisible,
    previewToggleVisible: previewToggle,
  });
  // #endregion
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
    // #region agent log
    const vp = page.viewportSize();
    debugLog("H5", "authenticated.pw.ts:preview-toggle", "viewport before toggle", {
      viewport: vp,
    });
    // #endregion
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

/** Always runs — probes /auth selectors without credentials (H3 / bridging). */
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
  // #region agent log
  debugLog("H3", "authenticated.pw.ts:probe", "public auth probe after wait", {
    emailCount,
    passwordCount,
    path: new URL(page.url()).pathname,
    bodyText: (await page.locator("body").innerText()).slice(0, 80),
  });
  // #endregion
  expect(emailCount).toBeGreaterThan(0);
  expect(passwordCount).toBeGreaterThan(0);
});
