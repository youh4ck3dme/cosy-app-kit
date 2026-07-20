import { test, expect } from "@playwright/test";
import { appendFileSync } from "node:fs";

/** Well-formed UUID that will never exist as a public artifact. */
const MISSING_PUBLIC_ID = "00000000-0000-4000-8000-000000000001";

const DEBUG_LOG = "/Users/erikbabcan/lovable-builder-cosyapp/.cursor/debug-73efc2.log";
function dbg(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>,
) {
  // #region agent log
  try {
    appendFileSync(
      DEBUG_LOG,
      JSON.stringify({
        sessionId: "73efc2",
        runId: "post-fix",
        hypothesisId,
        location,
        message,
        data,
        timestamp: Date.now(),
      }) + "\n",
    );
  } catch {
    /* ignore */
  }
  // #endregion
}

/**
 * Public / unauth routes — stable without Mistral or login.
 */
test.describe("Public routes", () => {
  test("landing responds", async ({ page }) => {
    const res = await page.goto("/");
    expect(res).toBeTruthy();
    expect(res!.status()).toBeLessThan(500);
    await expect(page.locator("body")).toBeVisible();
  });

  test("templates index", async ({ page }) => {
    await page.goto("/templates");
    await expect(page.getByRole("heading", { name: /templates/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("unknown public artifact shows 404 chrome", async ({ page }) => {
    test.setTimeout(60_000);
    const t0 = Date.now();
    const res = await page.goto(`/a/${MISSING_PUBLIC_ID}`);
    // #region agent log
    dbg("B", "public-routes.pw.ts:goto", "after goto", {
      status: res?.status() ?? null,
      url: page.url(),
      ms: Date.now() - t0,
    });
    // #endregion

    const testIdCount = await page.getByTestId("public-artifact-not-found").count();
    const bodyText = await page.locator("body").innerText().catch(() => "");
    // #region agent log
    dbg("A", "public-routes.pw.ts:dom", "before testid assert", {
      testIdCount,
      bodySnippet: bodyText.slice(0, 240),
      hasAsciiCopy: /is not public|does not exist/i.test(bodyText),
      hasApostropheCopy: /isn't public|doesn't exist/i.test(bodyText),
      ms: Date.now() - t0,
    });
    // #endregion

    await expect(page.getByTestId("public-artifact-not-found")).toBeVisible({
      timeout: 25_000,
    });
    await expect(page.getByTestId("public-artifact-not-found")).toContainText("404");
    await expect(page.getByTestId("public-artifact-not-found")).toContainText(
      /not public|does not exist/i,
    );
    // #region agent log
    dbg("B", "public-routes.pw.ts:ok", "404 chrome asserted", { ms: Date.now() - t0 });
    // #endregion
  });

  test("auth route reachable", async ({ page }) => {
    const res = await page.goto("/auth");
    expect(res).toBeTruthy();
    expect(res!.status()).toBeLessThan(500);
    await expect(page.locator("body")).toBeVisible();
  });
});
