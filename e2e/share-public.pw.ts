import { test, expect } from "@playwright/test";
import { appendFileSync } from "node:fs";

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

test.describe("Public share", () => {
  test("templates index renders", async ({ page }) => {
    await page.goto("/templates");
    await expect(page.getByRole("heading", { name: /templates/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("public artifact missing id shows 404", async ({ page }) => {
    test.setTimeout(60_000);
    const t0 = Date.now();
    const res = await page.goto(`/a/${MISSING_PUBLIC_ID}`);
    // #region agent log
    dbg("B", "share-public.pw.ts:goto", "after goto", {
      status: res?.status() ?? null,
      url: page.url(),
      ms: Date.now() - t0,
    });
    // #endregion

    const testIdCount = await page.getByTestId("public-artifact-not-found").count();
    // #region agent log
    dbg("E", "share-public.pw.ts:dom", "before testid assert", {
      testIdCount,
      ms: Date.now() - t0,
    });
    // #endregion

    await expect(page.getByTestId("public-artifact-not-found")).toBeVisible({
      timeout: 25_000,
    });
    await expect(page.getByTestId("public-artifact-not-found")).toContainText("404");
    // #region agent log
    dbg("B", "share-public.pw.ts:ok", "404 asserted", { ms: Date.now() - t0 });
    // #endregion
  });
});
