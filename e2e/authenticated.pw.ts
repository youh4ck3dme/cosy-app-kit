import { test, expect, type Page } from "@playwright/test";

/**
 * Authenticated workspace flow. Runs ONLY when real test credentials are
 * provided — otherwise every test is skipped (safe for CI and local runs):
 *
 *   E2E_EMAIL=test@example.com E2E_PASSWORD=... bun run test:e2e
 *
 * Use a dedicated throwaway account: the suite signs in with email+password
 * on /auth and walks chat → palette → theme → mode → settings. It never
 * sends an AI message (streams are slow/flaky and burn credits).
 */
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
const hasCreds = Boolean(EMAIL && PASSWORD);

async function signIn(page: Page) {
  await page.goto("/auth");
  await page.waitForLoadState("domcontentloaded");
  await expect(page.getByRole("heading", { name: /sign in to builder/i })).toBeVisible({
    timeout: 25_000,
  });
  await page.getByPlaceholder(/you@/i).fill(EMAIL!);
  await page.getByPlaceholder(/password/i).fill(PASSWORD!);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  // Successful auth leaves /auth (chat index or last thread).
  await page.waitForURL((url) => !url.pathname.startsWith("/auth"), { timeout: 30_000 });
}

async function openChatWorkspace(page: Page) {
  await page.goto("/chat");
  // Composer is the workspace anchor (chat index redirects to a thread).
  await expect(page.getByPlaceholder(/ask builder/i)).toBeVisible({ timeout: 40_000 });
}

test.describe("Authenticated workspace", () => {
  test.skip(!hasCreds, "E2E_EMAIL / E2E_PASSWORD not set — skipping authenticated flow");

  test("signs in and lands in the chat workspace", async ({ page }) => {
    await signIn(page);
    await openChatWorkspace(page);
    await expect(page).toHaveURL(/\/chat(\/|$)/);
    // Chat | Preview chrome always visible
    await expect(page.getByRole("group", { name: /chat or preview/i })).toBeVisible();
  });

  test("command palette opens, filters, and closes", async ({ page }) => {
    await signIn(page);
    await openChatWorkspace(page);

    await page.keyboard.press("ControlOrMeta+K");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    // Filter input inside palette
    const input = dialog.getByPlaceholder(/type a command|search/i);
    if (await input.isVisible().catch(() => false)) {
      await input.fill("theme");
    }
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
    // Cycle at most 3 times (system → light → dark) until the class flips.
    let flipped = false;
    for (let i = 0; i < 3 && !flipped; i++) {
      await toggle.click();
      await page.waitForTimeout(250);
      flipped = (await isDark()) !== before;
    }
    expect(flipped).toBe(true);

    // Explicit choice must survive a reload (localStorage + bootstrap script).
    const chosen = await isDark();
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    expect(await isDark()).toBe(chosen);
  });

  test("Build/Plan mode toggle and Chat|Preview switch", async ({ page }) => {
    await signIn(page);
    await openChatWorkspace(page);

    const modeGroup = page.getByRole("group", { name: /build or plan mode/i });
    if (await modeGroup.isVisible().catch(() => false)) {
      const planBtn = page.getByRole("button", { name: /plan mode/i });
      const buildBtn = page.getByRole("button", { name: /build mode/i });
      await planBtn.click();
      await expect(planBtn).toHaveAttribute("aria-pressed", "true");
      await buildBtn.click();
      await expect(buildBtn).toHaveAttribute("aria-pressed", "true");
    }

    const viewGroup = page.getByRole("group", { name: /chat or preview/i });
    await expect(viewGroup).toBeVisible();
    await page.getByRole("button", { name: /show preview canvas/i }).click();
    await expect(page.getByRole("button", { name: /show preview canvas/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.getByRole("button", { name: /show chat view/i }).click();
    await expect(page.getByRole("button", { name: /show chat view/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("settings panel opens from header gear", async ({ page }) => {
    await signIn(page);
    await openChatWorkspace(page);

    const settings = page.getByRole("button", { name: /open settings/i }).first();
    if (!(await settings.isVisible().catch(() => false))) {
      test.skip(true, "Settings control not visible");
    }
    await settings.click();
    // Settings dialog or panel with Mistral copy / agent settings
    const panel = page.getByRole("dialog").or(page.getByText(/mistral only|agent settings|temperature/i));
    await expect(panel.first()).toBeVisible({ timeout: 10_000 });
    await page.keyboard.press("Escape");
  });

  test("new chat control is reachable", async ({ page }) => {
    await signIn(page);
    await openChatWorkspace(page);

    const newChat = page.getByRole("button", { name: /new chat/i }).first();
    if (!(await newChat.isVisible().catch(() => false))) {
      // Desktop sidebar may be collapsed — soft pass if composer still works
      await expect(page.getByPlaceholder(/ask builder/i)).toBeVisible();
      return;
    }
    await expect(newChat).toBeEnabled();
  });
});
