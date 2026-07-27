import { test, expect, type Page } from "@playwright/test";

/** Full public product journey — start → end without AI stream or login. */
const MISSING_PUBLIC_ID = "00000000-0000-4000-8000-000000000001";
const TEMPLATE_SLUG = "saas-landing";


/** Clear Supabase session (localStorage) so public gates stay unauthenticated. */
async function clearBrowserSession(page: Page) {
  await page.context().clearCookies();
  await page.addInitScript(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
  });
  // Also clear if a page is already open
  try {
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {
        /* ignore */
      }
    });
  } catch {
    /* no page yet */
  }
}


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
    await expect(page.getByRole("link", { name: /^templates$/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /sign in/i }).first()).toBeVisible();
  });

  test("2 · Open Builder CTA gates unauthenticated users", async ({ page }) => {
    test.setTimeout(90_000);
    await clearBrowserSession(page);
    await page.goto("/");
    await expect(page.getByTestId("landing-hero")).toBeVisible({ timeout: 20_000 });
    await page.getByRole("link", { name: /open builder/i }).click();
    // /chat is ssr:false — may land briefly then bounce to /auth
    await page.waitForURL(/\/(auth|chat)/, { timeout: 30_000 });
    if (!page.url().includes("/auth")) {
      await page.waitForURL(/\/auth/, { timeout: 30_000 });
    }
    await expect(page.getByTestId("auth-sign-in")).toBeVisible({ timeout: 25_000 });
  });

  test("3 · Browse templates → open detail", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("landing-hero")).toBeVisible({ timeout: 20_000 });
    await page.getByRole("link", { name: /browse templates/i }).click();
    await page.waitForURL(/\/templates/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { level: 1, name: /^templates$/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole("link", { name: /saas landing/i })).toBeVisible();
    await page.getByRole("link", { name: /saas landing/i }).click();
    await page.waitForURL(new RegExp(`/templates/${TEMPLATE_SLUG}`), { timeout: 15_000 });
    await expect(page.getByRole("heading", { level: 1, name: /saas landing/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: /use template/i })).toBeVisible();
  });

  test("4 · Use template without session → auth with next=/chat", async ({ page }) => {
    await clearBrowserSession(page);
    await page.goto(`/templates/${TEMPLATE_SLUG}`);
    await expect(page.getByRole("heading", { level: 1, name: /saas landing/i })).toBeVisible({
      timeout: 20_000,
    });
    // Wipe again after first paint (supabase may rehydrate from residual storage)
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {
        /* ignore */
      }
    });
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: /saas landing/i })).toBeVisible({
      timeout: 20_000,
    });

    const useBtn = page.getByRole("button", { name: /use template/i });
    await expect(useBtn).toBeEnabled();
    await Promise.all([
      page.waitForURL((url) => url.pathname.startsWith("/auth") || url.pathname.startsWith("/chat"), {
        timeout: 25_000,
      }),
      useBtn.click(),
    ]);
    // Unauthenticated: auth. With residual session: chat (then still OK if gated).
    if (page.url().includes("/chat")) {
      await page.waitForURL(/\/auth/, { timeout: 20_000 }).catch(() => {});
    }
    expect(page.url()).toMatch(/\/auth/);
    await expect(page.getByTestId("auth-sign-in")).toBeVisible({ timeout: 20_000 });
  });

  test("5 · Auth form renders email/password + Google + mode toggle", async ({ page }) => {
    test.setTimeout(90_000);
    await clearBrowserSession(page);
    await page.goto("/auth");
    // Bridge shell can take up to ~12s fail-open
    await expect(page.getByTestId("auth-sign-in")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("heading", { name: /sign in to builder/i })).toBeVisible();
    await expect(page.getByPlaceholder(/you@/i)).toBeVisible();
    await expect(page.getByPlaceholder(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /^sign in$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
    await page.getByRole("button", { name: /no account yet/i }).click();
    await expect(page.getByRole("heading", { name: /create your builder account/i })).toBeVisible();
    await page.getByRole("button", { name: /already have an account/i }).click();
    await expect(page.getByRole("heading", { name: /sign in to builder/i })).toBeVisible();
  });

  test("6 · Protected /chat redirects to /auth", async ({ page }) => {
    await clearBrowserSession(page);
    await page.goto("/chat");
    await page.waitForURL(/\/auth/, { timeout: 30_000 });
    await expect(page.getByTestId("auth-sign-in")).toBeVisible({ timeout: 20_000 });
  });

  test("7 · /api/ai-status health probe", async ({ request }) => {
    const res = await request.get("/api/ai-status");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.provider).toBe("mistral");
    expect(body.lovableGatewayDisabled).toBe(true);
    expect(body.tools).toEqual(
      expect.arrayContaining([
        "create_artifact",
        "edit_file",
        "read_artifact",
        "plan_steps",
        "launch_site",
      ]),
    );
  });

  test("8 · PWA assets respond", async ({ request }) => {
    for (const path of ["/manifest.webmanifest", "/sw.js", "/offline.html", "/icons/icon-192.png"]) {
      expect((await request.get(path)).status(), path).toBe(200);
    }
  });

  test("9 · Public artifact missing id shows 404 chrome", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(`/a/${MISSING_PUBLIC_ID}`);
    await expect(page.getByTestId("public-artifact-not-found")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("public-artifact-not-found")).toContainText("404");
  });

  test("10 · Preview rejects traversal + unknown private artifact", async ({ request }) => {
    const traversal = await request.get(`/preview/${MISSING_PUBLIC_ID}/../etc/passwd`);
    expect([400, 404, 500]).toContain(traversal.status());
    expect(await traversal.text()).not.toContain("root:");
    const missing = await request.get(`/preview/00000000-0000-4000-8000-000000000099/index.html`);
    expect(missing.status()).toBe(404);
  });

  test("11 · Mobile 390px: landing + templates no overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.getByTestId("landing-hero")).toBeVisible({ timeout: 20_000 });
    await assertNoCatastrophicOverflow(page);
    await page.goto("/templates");
    await expect(page.getByRole("heading", { level: 1, name: /^templates$/i })).toBeVisible({
      timeout: 20_000,
    });
    await assertNoCatastrophicOverflow(page);
  });

  test("12 · Deep links: header Templates + Sign in from landing", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("landing-hero")).toBeVisible({ timeout: 20_000 });
    await page.locator("header").getByRole("link", { name: /^templates$/i }).click();
    await page.waitForURL(/\/templates/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { level: 1, name: /^templates$/i })).toBeVisible();
    await page.getByRole("link", { name: /sign in/i }).first().click();
    await page.waitForURL(/\/auth/, { timeout: 15_000 });
    await expect(page.getByTestId("auth-sign-in")).toBeVisible({ timeout: 20_000 });
  });
});

async function assertNoCatastrophicOverflow(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 24);
}
