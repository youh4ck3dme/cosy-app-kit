import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

/**
 * Full public product journey — start → end without AI stream or login.
 *
 * Walks the unauthenticated surface the way a first-time visitor would:
 * landing → templates → template detail → auth gate → API health →
 * PWA assets → public 404 → preview hard-fail → mobile shell.
 *
 * Authenticated + AI turns live in `authenticated.pw.ts` (needs E2E_EMAIL/PASSWORD).
 */
const MISSING_PUBLIC_ID = "00000000-0000-4000-8000-000000000001";
const TEMPLATE_SLUG = "saas-landing";

test.describe.configure({ mode: "serial" });

test.describe("Full app journey (public surface)", () => {
  test("1 · landing hero, how-it-works, features, footer", async ({ page }) => {
    const res = await page.goto("/");
    expect(res).toBeTruthy();
    expect(res!.status()).toBeLessThan(500);

    const hero = page.getByTestId("landing-hero");
    await expect(hero).toBeVisible({ timeout: 20_000 });
    await expect(hero.getByRole("heading", { level: 1 })).toContainText(/build/i);
    await expect(hero.getByRole("link", { name: /open builder/i })).toBeVisible();
    await expect(hero.getByRole("link", { name: /browse templates/i })).toBeVisible();

    // Decorative pricing mock in hero canvas
    await expect(hero.getByText("Starter")).toBeVisible();
    await expect(hero.getByText("Pro")).toBeVisible();
    await expect(hero.getByText("Team")).toBeVisible();

    const how = page.getByTestId("landing-how-it-works");
    await expect(how).toBeVisible();
    await expect(how.getByRole("heading", { name: /how it works/i })).toBeVisible();
    await expect(how.getByText("Chat")).toBeVisible();
    await expect(how.getByText("Canvas")).toBeVisible();
    await expect(how.getByText("Share")).toBeVisible();

    const features = page.getByTestId("landing-feature-grid");
    await expect(features).toBeVisible();
    await expect(
      features.getByRole("heading", { name: /everything the canvas already does/i }),
    ).toBeVisible();
    await expect(features.getByText(/live device preview/i)).toBeVisible();
    await expect(features.getByText(/console & network/i)).toBeVisible();

    // Header + footer nav
    await expect(page.getByRole("link", { name: /^templates$/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /sign in/i }).first()).toBeVisible();
  });

  test("2 · Open Builder CTA redirects unauth users to /auth", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("landing-hero")).toBeVisible({ timeout: 20_000 });

    await page.getByRole("link", { name: /open builder/i }).click();
    await page.waitForURL(/\/(auth|chat)/, { timeout: 20_000 });

    // Unauthenticated: must land on auth (or briefly chat then bounce).
    if (!page.url().includes("/auth")) {
      await page.waitForURL(/\/auth/, { timeout: 15_000 }).catch(() => {});
    }
    expect(page.url()).toMatch(/\/auth/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("3 · Browse templates → filter → open detail", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("landing-hero")).toBeVisible({ timeout: 20_000 });

    await page.getByRole("link", { name: /browse templates/i }).click();
    await page.waitForURL(/\/templates/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /^templates$/i })).toBeVisible({
      timeout: 20_000,
    });

    // Category tabs
    const tablist = page.getByRole("tablist", { name: /categories/i });
    await expect(tablist).toBeVisible();
    await expect(tablist.getByRole("tab", { name: /^all$/i })).toBeVisible();
    await expect(tablist.getByRole("tab", { name: /landing/i })).toBeVisible();

    // Filter to Landing
    await tablist.getByRole("tab", { name: /landing/i }).click();
    await expect(tablist.getByRole("tab", { name: /landing/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByRole("link", { name: /saas landing/i })).toBeVisible();

    // Open a known seed template
    await page.getByRole("link", { name: /saas landing/i }).click();
    await page.waitForURL(new RegExp(`/templates/${TEMPLATE_SLUG}`), { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /saas landing/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/hero, features, pricing/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /use template/i })).toBeVisible();
  });

  test("4 · Use template without session → auth with next=/chat", async ({ page }) => {
    await page.goto(`/templates/${TEMPLATE_SLUG}`);
    await expect(page.getByRole("heading", { name: /saas landing/i })).toBeVisible({
      timeout: 20_000,
    });

    await page.getByRole("button", { name: /use template/i }).click();
    await page.waitForURL(/\/auth/, { timeout: 20_000 });
    expect(page.url()).toMatch(/\/auth/);
    // next should point at chat so post-login continues the template flow
    expect(page.url()).toMatch(/next=/);
  });

  test("5 · Auth form renders email/password + Google + mode toggle", async ({ page }) => {
    await page.goto("/auth");
    // Bridge shell ("Completing sign-in…") then form
    await expect(page.getByRole("heading", { name: /sign in to builder/i })).toBeVisible({
      timeout: 25_000,
    });
    await expect(page.getByPlaceholder(/you@/i)).toBeVisible();
    await expect(page.getByPlaceholder(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /^sign in$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();

    // Toggle to signup and back
    await page.getByRole("button", { name: /no account yet/i }).click();
    await expect(page.getByRole("heading", { name: /create your builder account/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /create account/i })).toBeVisible();
    await page.getByRole("button", { name: /already have an account/i }).click();
    await expect(page.getByRole("heading", { name: /sign in to builder/i })).toBeVisible();
  });

  test("6 · Protected /chat redirects to /auth", async ({ page }) => {
    // Clear any leftover session from other specs
    await page.context().clearCookies();
    await page.goto("/chat");
    await page.waitForURL(/\/auth/, { timeout: 20_000 });
    expect(page.url()).toMatch(/\/auth/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("7 · /api/ai-status health probe", async ({ request }) => {
    const res = await request.get("/api/ai-status");
    expect(res.status()).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      provider: string;
      tools: string[];
      lovableGatewayDisabled: boolean;
      mistralKeyPresent: boolean;
      features: Record<string, unknown>;
      defaultModel?: string;
      buildMarker?: string;
      shellRev?: string;
    };

    expect(body.ok).toBe(true);
    expect(body.provider).toBe("mistral");
    expect(body.lovableGatewayDisabled).toBe(true);
    expect(Array.isArray(body.tools)).toBe(true);
    expect(body.tools).toEqual(
      expect.arrayContaining([
        "create_artifact",
        "edit_file",
        "read_artifact",
        "plan_steps",
        "launch_site",
      ]),
    );
    expect(body.features).toMatchObject({
      fenceFallback: true,
      artifactVersions: true,
      launchSite: true,
    });
    // Local .env.local should have the key; do not fail hard if CI has none.
    if (body.mistralKeyPresent) {
      expect(typeof body.defaultModel).toBe("string");
    }
    expect(body.buildMarker || body.shellRev).toBeTruthy();
  });

  test("8 · PWA assets respond", async ({ request }) => {
    for (const path of [
      "/manifest.webmanifest",
      "/sw.js",
      "/offline.html",
      "/icons/icon-192.png",
    ] as const) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(200);
    }

    const manifest = await (await request.get("/manifest.webmanifest")).json();
    expect(manifest).toMatchObject({ id: expect.any(String) });
  });

  test("9 · Public artifact missing id shows 404 chrome", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(`/a/${MISSING_PUBLIC_ID}`);
    await expect(page.getByTestId("public-artifact-not-found")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("public-artifact-not-found")).toContainText("404");
    await expect(page.getByTestId("public-artifact-not-found")).toContainText(
      /not public|does not exist/i,
    );
  });

  test("10 · Preview rejects traversal + unknown private artifact", async ({
    request,
  }: {
    request: APIRequestContext;
  }) => {
    const traversal = await request.get(`/preview/${MISSING_PUBLIC_ID}/../etc/passwd`);
    expect([400, 404, 500]).toContain(traversal.status());
    expect(await traversal.text()).not.toContain("root:");

    const missing = await request.get(
      `/preview/00000000-0000-4000-8000-000000000099/index.html`,
    );
    expect(missing.status()).toBe(404);
  });

  test("11 · Mobile 390px: landing + templates no overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto("/");
    await expect(page.getByTestId("landing-hero")).toBeVisible({ timeout: 20_000 });
    await assertNoCatastrophicOverflow(page);

    await page.goto("/templates");
    await expect(page.getByRole("heading", { name: /^templates$/i })).toBeVisible({
      timeout: 20_000,
    });
    await assertNoCatastrophicOverflow(page);

    // Chat entry still boots (auth gate)
    const res = await page.goto("/chat");
    expect(res).toBeTruthy();
    expect(res!.status()).toBeLessThan(500);
    await expect(page.locator("body")).toBeVisible();
  });

  test("12 · Deep links: header Templates + Sign in from landing", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("landing-hero")).toBeVisible({ timeout: 20_000 });

    // Header nav "Templates"
    await page.locator("header").getByRole("link", { name: /^templates$/i }).click();
    await page.waitForURL(/\/templates/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /^templates$/i })).toBeVisible();

    // Templates → Sign in
    await page.getByRole("link", { name: /sign in/i }).first().click();
    await page.waitForURL(/\/auth/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /sign in to builder/i })).toBeVisible({
      timeout: 25_000,
    });
  });
});

async function assertNoCatastrophicOverflow(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  // Modest scrollbar / safe-area slack
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 24);
}
