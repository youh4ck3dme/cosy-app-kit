import { defineConfig, devices } from "@playwright/test";

/**
 * Local quality gate (MR-40 / Cursor L).
 * Not part of GitHub CI — auth secrets and flaky stream make CI e2e painful.
 *
 *   bun run test:e2e:install
 *   bun run dev   # terminal A (default 3000 or set PLAYWRIGHT_BASE_URL)
 *   bun run test:e2e
 */
// Lovable vite stack defaults to 8080 (see scripts/smoke.ts)
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:8080";
const startWebServer = process.env.PLAYWRIGHT_WEB_SERVER !== "0";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.pw.ts",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  // Default: chromium only (fast gate). PW_MOBILE=1 adds Pixel 7 project.
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    ...(process.env.PW_MOBILE === "1"
      ? [
          {
            name: "mobile-chrome",
            use: { ...devices["Pixel 7"] },
          },
        ]
      : []),
  ],
  /* Starts dev server unless PLAYWRIGHT_WEB_SERVER=0 (reuse existing). */
  webServer: startWebServer
    ? {
        command: "bun run dev --host 127.0.0.1",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
});
