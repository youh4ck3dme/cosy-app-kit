import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { SHELL_REV } from "./deploy-rev";

const PUBLIC = join(__dirname, "../../public");

describe("PWA assets & App Store Readiness", () => {
  it("manifest parses and icons & App Store fields exist", () => {
    const manifest = JSON.parse(readFileSync(join(PUBLIC, "manifest.webmanifest"), "utf8"));
    expect(manifest.name).toBeTruthy();
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/chat");
    expect(manifest.id).toBeTruthy();
    expect(manifest.categories).toContain("developer");
    expect(manifest.shortcuts.length).toBeGreaterThanOrEqual(2);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(3);
    for (const icon of manifest.icons as { src: string }[]) {
      expect(existsSync(join(PUBLIC, icon.src))).toBe(true);
    }
    expect((manifest.icons as { purpose?: string }[]).some((i) => i.purpose === "maskable")).toBe(
      true,
    );
  });

  it("offline page and SW guards API", () => {
    expect(existsSync(join(PUBLIC, "offline.html"))).toBe(true);
    const sw = readFileSync(join(PUBLIC, "sw.js"), "utf8");
    expect(sw).toContain('req.method !== "GET"');
    expect(sw).toContain('url.pathname.startsWith("/api/")');
    expect(sw).toContain("url.origin !== self.location.origin");
    expect(sw).toMatch(/const CACHE = "builder-v\d+"/);
  });

  it("shell rev is a non-empty deploy fingerprint", () => {
    expect(SHELL_REV).toMatch(/^native-shell-\d+$/);
  });
});
