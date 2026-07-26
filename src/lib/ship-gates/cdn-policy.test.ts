import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildPreviewCsp } from "@/lib/project-fs";
import {
  CDN_SCAN_TARGETS,
  findUnapprovedCdnMentions,
  previewCspAllowsBareScriptCdn,
} from "@/lib/ship-gates";

describe("ship-gates / CDN policy", () => {
  it("preview CSP does not allow bare script CDNs", () => {
    const csp = buildPreviewCsp({});
    expect(previewCspAllowsBareScriptCdn(csp)).toBe(false);
    expect(csp).toMatch(/script-src 'self' 'unsafe-inline'/);
  });

  it("prompt/seed sources do not recommend bare script CDNs", () => {
    const allFindings: string[] = [];
    for (const rel of CDN_SCAN_TARGETS) {
      const source = readFileSync(rel, "utf8");
      for (const f of findUnapprovedCdnMentions(source)) {
        allFindings.push(`${rel}: ${f.host} — …${f.snippet.slice(0, 120)}…`);
      }
    }
    expect(allFindings, allFindings.join("\n")).toEqual([]);
  });

  it("findUnapprovedCdnMentions allows ban-context mentions", () => {
    const ok =
      "Do NOT use bare CDN URLs (cdn.jsdelivr.net, unpkg.com): CSP blocks them.";
    expect(findUnapprovedCdnMentions(ok)).toEqual([]);
  });

  it("findUnapprovedCdnMentions flags bare recommendations", () => {
    const bad =
      'Use Chart.js from https://cdn.jsdelivr.net/npm/chart.js for dashboards.';
    const hits = findUnapprovedCdnMentions(bad);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.host).toMatch(/cdn\.jsdelivr\.net/i);
  });
});
