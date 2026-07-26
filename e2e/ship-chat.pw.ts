import { test, expect } from "@playwright/test";

/**
 * Ship-loop chat happy path (no auth secrets required).
 * - Protected /chat → /auth
 * - /api/ai-status health
 * - Auth wow testid visible
 */
test.describe("Ship chat gate", () => {
  test("protected /chat redirects to /auth with sign-in chrome", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/chat");
    await page.waitForURL(/\/auth/, { timeout: 20_000 });
    expect(page.url()).toMatch(/\/auth/);
    await expect(page.getByTestId("auth-sign-in")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("heading", { name: /sign in to builder/i })).toBeVisible();
  });

  test("/api/ai-status reports mistral builder health", async ({ request }) => {
    const res = await request.get("/api/ai-status");
    expect(res.status()).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      provider: string;
      lovableGatewayDisabled: boolean;
    };
    expect(body.ok).toBe(true);
    expect(body.provider).toBe("mistral");
    expect(body.lovableGatewayDisabled).toBe(true);
  });
});
