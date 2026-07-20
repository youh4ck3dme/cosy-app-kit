import { defineConfig, devices } from "@playwright/test";

/** Local-only Playwright — do not add to GitHub CI. */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.pw.ts",
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
