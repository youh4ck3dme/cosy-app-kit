import { test, expect, type Page } from "@playwright/test";
import { E2E_AUTH_FILE, loadE2eAuthFromFile } from "./load-e2e-auth";

/**
 * Authenticated workspace. Runs ONLY with credentials:
 *
 *   E2E_EMAIL=… E2E_PASSWORD=… bun run test:e2e -- e2e/authenticated.pw.ts
 *   # or fill gitignored e2e/e2e:authenticated.md (see e2e:authenticated.md.example)
 *
 * Never sends AI messages.
 */
loadE2eAuthFromFile();
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
  // Fresh profiles clear storage in beforeEach — mark tour done so it cannot trap the shell
  // (Escape previously did nothing; overlay blocks Chat|Preview on phones).
  await page.evaluate(() => {
    try {
      localStorage.setItem("builder:tour-done", "1");
    } catch {
      /* ignore */
    }
  });
  const tour = page.getByRole("dialog", { name: "Builder tour" });
  if (await tour.isVisible().catch(() => false)) {
    await page.getByRole("button", { name: /^skip$/i }).click();
    await expect(tour).toBeHidden({ timeout: 5_000 });
  }
  await expect(page.getByTestId("chat-composer")).toBeVisible({ timeout: 40_000 });
}

test.describe("Authenticated workspace", () => {
  test.skip(
    !hasCreds,
    `E2E_EMAIL / E2E_PASSWORD not set — fill ${E2E_AUTH_FILE} or export env vars`,
  );

  test.beforeEach(async ({ page }) => {
    // Avoid sticky Supabase/OAuth session leaving /auth on AuthPendingShell forever in workers.
    await page.context().clearCookies();
    await page.goto("/auth");
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
        // Prevent Builder tour from trapping the shell on first chat paint (phones + e2e).
        localStorage.setItem("builder:tour-done", "1");
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
    // Do not use bare getByRole("dialog") — Builder tour shares that role.
    const palette = page.getByPlaceholder(/type a command or search/i);
    await expect(palette).toBeVisible({ timeout: 5_000 });
    await page.keyboard.press("Escape");
    await expect(palette).toBeHidden({ timeout: 5_000 });
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
  // Local/LAN builds expose one-tap developer entry (credentials from VITE_DEV_*).
  await expect(page.getByTestId("auth-developer-entry")).toBeVisible();
});
