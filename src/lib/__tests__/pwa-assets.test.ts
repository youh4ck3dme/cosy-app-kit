import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const PUBLIC = join(import.meta.dir, "../../../public");

describe("PWA assets", () => {
  test("manifest parses and every referenced icon exists", () => {
    const manifest = JSON.parse(readFileSync(join(PUBLIC, "manifest.webmanifest"), "utf8"));
    expect(manifest.name).toBeTruthy();
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/chat");
    expect(manifest.icons.length).toBeGreaterThanOrEqual(3);
    for (const icon of manifest.icons) {
      expect(existsSync(join(PUBLIC, icon.src))).toBe(true);
    }
    expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === "maskable")).toBe(true);
  });

  test("offline fallback page exists", () => {
    expect(existsSync(join(PUBLIC, "offline.html"))).toBe(true);
  });

  test("service worker never intercepts API or non-GET traffic", () => {
    const sw = readFileSync(join(PUBLIC, "sw.js"), "utf8");
    expect(sw).toContain('req.method !== "GET"');
    expect(sw).toContain('url.pathname.startsWith("/api/")');
    expect(sw).toContain("url.origin !== self.location.origin");
    // Versioned cache name so deploys can invalidate old caches.
    expect(sw).toMatch(/const CACHE = "builder-v\d+"/);
  });
});
