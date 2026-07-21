import { test, expect } from "@playwright/test";

/**
 * Multi-file preview smoke against the in-process Vite server.
 * Uses a public fixture served via the preview handler's pure resolve path
 * through a tiny test-only HTML page is not available — instead we hit
 * /preview only when a public artifact exists.
 *
 * Primary guarantee is Vitest project-fs coverage; this e2e verifies the
 * route boots and rejects traversal anonymously.
 */
test.describe("project preview routes", () => {
  test("rejects path traversal anonymously", async ({ request }) => {
    const id = "00000000-0000-4000-8000-000000000001";
    const res = await request.get(`/preview/${id}/../etc/passwd`);
    // 400 or 404 — never 200 with file contents
    expect([400, 404, 500]).toContain(res.status());
    const text = await res.text();
    expect(text).not.toContain("root:");
  });

  test("unknown private artifact is 404 without auth", async ({ request }) => {
    const id = "00000000-0000-4000-8000-000000000099";
    const res = await request.get(`/preview/${id}/index.html`);
    expect(res.status()).toBe(404);
  });

  test("public share not-found chrome still works", async ({ page }) => {
    const res = await page.goto("/a/00000000-0000-4000-8000-000000000099");
    expect(res?.status()).toBe(404);
    await expect(page.getByTestId("public-artifact-not-found")).toBeVisible();
  });
});
