/**
 * Browser smoke test: boots the dev server, then checks the auth page,
 * PWA assets, skip-link focus, and responsive rendering at three widths.
 *
 * Requires Playwright + a Chromium binary. Run with:
 *   bun scripts/smoke.ts
 * Optional env:
 *   SMOKE_BASE_URL   — test an already-running server instead of booting one
 *   CHROMIUM_PATH    — explicit browser binary (falls back to Playwright's own)
 */
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";

const BASE = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:8080";

async function importChromium() {
  for (const pkg of ["playwright-core", "playwright"]) {
    try {
      const m = await import(pkg);
      return m.chromium;
    } catch {
      // try next
    }
  }
  throw new Error("Playwright not found — install it or run where it's available.");
}

function chromiumExecutable(): string | undefined {
  const candidates = [process.env.CHROMIUM_PATH, "/opt/pw-browsers/chromium"];
  return candidates.find((p) => p && existsSync(p)) ?? undefined;
}

async function waitFor(url: string, timeoutMs: number) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server at ${url} not ready within ${timeoutMs}ms`);
}

let server: ChildProcess | null = null;
let failures = 0;
const check = (ok: boolean, label: string) => {
  console.log(`${ok ? "✅" : "❌"} ${label}`);
  if (!ok) failures++;
};

try {
  if (!process.env.SMOKE_BASE_URL) {
    server = spawn("bun", ["run", "dev", "--host", "127.0.0.1"], { stdio: "ignore" });
    await waitFor(`${BASE}/auth`, 60_000);
  }

  const chromium = await importChromium();
  const browser = await chromium.launch({
    executablePath: chromiumExecutable(),
    args: ["--no-sandbox"],
  });

  // Static assets
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  for (const p of ["/manifest.webmanifest", "/sw.js", "/offline.html", "/icons/icon-192.png"]) {
    const r = await page.request.get(BASE + p);
    check(r.status() === 200, `GET ${p} → ${r.status()}`);
  }
  await ctx.close();

  // Auth page renders without page errors at three widths
  for (const [name, width, height] of [
    ["mobile", 375, 720],
    ["tablet", 768, 900],
    ["desktop", 1280, 800],
  ] as const) {
    const c = await browser.newContext({ viewport: { width, height } });
    const p = await c.newPage();
    const errors: string[] = [];
    p.on("pageerror", (e: Error) => errors.push(String(e)));
    await p.goto(`${BASE}/auth`, { waitUntil: "networkidle", timeout: 30_000 });
    const heading = await p.locator("h1, h2").first().textContent();
    check(Boolean(heading?.trim()), `${name}: page renders a heading`);
    check(errors.length === 0, `${name}: no page errors${errors[0] ? ` (${errors[0]})` : ""}`);
    await c.close();
  }

  // Skip link is the first tab stop
  const a11y = await browser.newContext({ reducedMotion: "reduce" });
  const ap = await a11y.newPage();
  await ap.goto(`${BASE}/auth`, { waitUntil: "networkidle" });
  await ap.keyboard.press("Tab");
  const focused = await ap.evaluate(() => document.activeElement?.textContent?.trim());
  check(focused === "Skip to content", `first Tab focuses skip link (got: ${JSON.stringify(focused)})`);
  await a11y.close();

  await browser.close();
} finally {
  server?.kill();
}

if (failures > 0) {
  console.error(`\n${failures} smoke check(s) failed`);
  process.exit(1);
}
console.log("\nAll smoke checks passed");
