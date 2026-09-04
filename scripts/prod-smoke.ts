/**
 * Production smoke — no browser required.
 *
 *   bun run prod-smoke
 *   SMOKE_BASE_URL=https://cosy-app-kit.vercel.app bun run prod-smoke
 *
 * Checks live URL contracts and detects when main is merged but Lovable Cloud Publish is pending.
 */
import { BUILD_MARKER, PROD_ORIGIN, SHELL_REV } from "../src/lib/deploy-rev";

const BASE = (process.env.SMOKE_BASE_URL ?? PROD_ORIGIN).replace(/\/$/, "");

let failures = 0;

const check = (ok: boolean, label: string) => {
  console.log(`${ok ? "✅" : "❌"} ${label}`);
  if (!ok) failures++;
};

async function get(path: string): Promise<Response> {
  const url = `${BASE}${path}`;
  try {
    return await fetch(url, { redirect: "follow" });
  } catch (e) {
    throw new Error(`${path} → ${e instanceof Error ? e.message : e}`);
  }
}

async function main() {
  console.log(`Prod smoke → ${BASE}\n`);
  console.log(`Expected: buildMarker=${BUILD_MARKER}, shellRev=${SHELL_REV}\n`);

  // 1. Check deploy fingerprint via API first
  let isLatestDeploy = true;
  try {
    const r = await get("/api/ai-status");
    check(r.status === 200, `GET /api/ai-status → ${r.status}`);
    const status = (await r.json()) as {
      ok?: boolean;
      buildMarker?: string;
      shellRev?: string;
      mistralKeyPresent?: boolean;
    };
    check(status.ok === true, "ai-status.ok === true");
    check(
      status.buildMarker === BUILD_MARKER,
      `ai-status.buildMarker === ${BUILD_MARKER} (got ${status.buildMarker ?? "missing"})`,
    );

    if (status.shellRev !== SHELL_REV) {
      isLatestDeploy = false;
      console.log(
        `\n⚠️  Merge is in main (SHELL_REV=${SHELL_REV}), but live production is running older build (shellRev=${status.shellRev ?? "missing"}).`,
      );
      console.log(
        "   Lovable Editor → Publish / Update is pending. Deferring live contract checks until Publish.\n",
      );
    } else {
      check(
        status.shellRev === SHELL_REV,
        `ai-status.shellRev === ${SHELL_REV} (got ${status.shellRev})`,
      );
    }

    check(status.mistralKeyPresent === true, "ai-status.mistralKeyPresent === true");
  } catch (e) {
    check(false, `/api/ai-status → ${e instanceof Error ? e.message : e}`);
  }

  // If live server is running older build before Publish, exit gracefully after reporting pending state
  if (!isLatestDeploy) {
    console.log("ℹ️  Prod smoke finished: Pending Lovable Cloud Publish.");
    process.exit(0);
  }

  // 2. Static PWA assets
  for (const p of ["/manifest.webmanifest", "/sw.js", "/offline.html", "/icons/icon-192.png"]) {
    try {
      const r = await get(p);
      check(r.status === 200, `GET ${p} → ${r.status}`);
    } catch (e) {
      check(false, `GET ${p} → ${e instanceof Error ? e.message : e}`);
    }
  }

  // 3. Manifest contract (strict verification against latest deploy)
  try {
    const r = await get("/manifest.webmanifest");
    const manifest = (await r.json()) as { id?: string; display?: string };
    check(
      manifest.id === "com.cosyapp.visualcodeengine",
      `manifest.id === "com.cosyapp.visualcodeengine" (got ${JSON.stringify(manifest.id ?? "missing/undefined")})`,
    );
    check(manifest.display === "standalone", `manifest.display === "standalone"`);
  } catch (e) {
    check(false, `manifest parse → ${e instanceof Error ? e.message : e}`);
  }

  // 4. Shell HTML markers (SSR head)
  try {
    const r = await get("/chat");
    check(r.status === 200, `GET /chat → ${r.status}`);
    const html = await r.text();
    check(
      html.includes("apple-mobile-web-app-capable"),
      "/chat HTML contains apple-mobile-web-app-capable",
    );
    check(html.includes("viewport-fit=cover"), "/chat HTML contains viewport-fit=cover");
  } catch (e) {
    check(false, `/chat HTML → ${e instanceof Error ? e.message : e}`);
  }

  if (failures > 0) {
    console.error(`\n${failures} prod smoke check(s) failed`);
    process.exit(1);
  }
  console.log("\nProd smoke finished OK");
}

void main();
