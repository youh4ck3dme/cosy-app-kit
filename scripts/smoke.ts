/**
 * Optional browser smoke (S7). Requires Playwright browsers.
 *
 *   bun run smoke
 *   SMOKE_BASE_URL=http://127.0.0.1:8080 bun run smoke   # use existing server
 *
 * Not wired into GitHub CI (no browser in CI by default).
 */
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";

const BASE = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:8080";

async function importChromium() {
  for (const pkg of ["playwright-core", "playwright", "@playwright/test"]) {
    try {
      // @playwright/test re-exports differently — try playwright first
      if (pkg === "@playwright/test") {
        const m = await import("playwright");
        return m.chromium;
      }
      const m = await import(pkg);
      return m.chromium;
    } catch {
      // next
    }
  }
  throw new Error(
    "Playwright not installed. Run: bun add -d playwright && bunx playwright install chromium",
  );
}

function chromiumExecutable(): string | undefined {
  const candidates = [process.env.CHROMIUM_PATH];
  return candidates.find((p) => p && existsSync(p)) ?? undefined;
}

async function waitFor(url: string, timeoutMs: number) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(url);
      if (r.ok || r.status === 404 || r.status === 307 || r.status === 302) return;
    } catch {
      // not up
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
    server = spawn("bun", ["run", "dev", "--host", "127.0.0.1"], {
      stdio: "ignore",
      cwd: process.cwd(),
    });
    await waitFor(`${BASE}/`, 90_000);
  }

  // Static PWA assets (no browser required)
  for (const p of ["/manifest.webmanifest", "/sw.js", "/offline.html", "/icons/icon-192.png"]) {
    try {
      const r = await fetch(BASE + p);
      check(r.status === 200, `GET ${p} → ${r.status}`);
    } catch (e) {
      check(false, `GET ${p} → ${e instanceof Error ? e.message : e}`);
    }
  }

  // Browser checks optional if playwright missing
  try {
    const chromium = await importChromium();
    const browser = await chromium.launch({
      executablePath: chromiumExecutable(),
      args: ["--no-sandbox"],
    });

    for (const [name, width, height] of [
      ["mobile", 375, 720],
      ["tablet", 768, 900],
      ["desktop", 1280, 800],
    ] as const) {
      const c = await browser.newContext({ viewport: { width, height } });
      const p = await c.newPage();
      const errors: string[] = [];
      p.on("pageerror", (e: Error) => errors.push(String(e)));
      await p.goto(`${BASE}/auth`, { waitUntil: "domcontentloaded", timeout: 30_000 });
      const heading = await p.locator("h1, h2").first().textContent().catch(() => null);
      check(Boolean(heading?.trim()), `${name}: page renders a heading`);
      check(errors.length === 0, `${name}: no page errors${errors[0] ? ` (${errors[0]})` : ""}`);
      await c.close();
    }

    await browser.close();
  } catch (e) {
    console.log(
      `⚠️  Browser smoke skipped: ${e instanceof Error ? e.message : e}`,
    );
    console.log("   PWA static checks above still count.");
  }
} finally {
  server?.kill();
}

if (failures > 0) {
  console.error(`\n${failures} smoke check(s) failed`);
  process.exit(1);
}
console.log("\nSmoke checks finished OK");
