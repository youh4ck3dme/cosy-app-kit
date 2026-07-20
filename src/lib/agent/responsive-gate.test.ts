import { describe, expect, it } from "vitest";
import { analyzeResponsiveHtml } from "./responsive-gate";

const GOOD = `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body{margin:0}
.sidebar{display:none}
@media (min-width:768px){.sidebar{display:block}}
.hamburger{display:block}
@media (min-width:768px){.hamburger{display:none}}
</style></head>
<body>
<button class="hamburger" aria-expanded="false">Menu</button>
<aside class="sidebar">Nav</aside>
<main>OK</main>
</body></html>`;

const NO_VIEWPORT = `<html><head><style>@media (max-width:768px){body{font-size:14px}}</style></head><body>x</body></html>`;

const NO_MEDIA = `<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>body{min-width:1200px}.sidebar{width:240px}</style>
</head><body><div class="sidebar">Nav</div></body></html>`;

const EMPTY = "";

describe("analyzeResponsiveHtml", () => {
  it("scores good mobile-first high", () => {
    const r = analyzeResponsiveHtml(GOOD);
    expect(r.hardFails).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(70);
  });

  it("fails missing viewport", () => {
    const r = analyzeResponsiveHtml(NO_VIEWPORT);
    expect(r.hardFails).toContain("missing_viewport");
    expect(r.ok).toBe(false);
  });

  it("fails no media + soft sidebar", () => {
    const r = analyzeResponsiveHtml(NO_MEDIA);
    expect(r.hardFails).toContain("no_media_queries");
    expect(r.softFails.some((s) => s.startsWith("large_min_width") || s === "sidebar_no_collapse")).toBe(
      true,
    );
    expect(r.ok).toBe(false);
    expect(r.hints.length).toBeGreaterThan(0);
  });

  it("empty html is zero", () => {
    const r = analyzeResponsiveHtml(EMPTY);
    expect(r.score).toBe(0);
    expect(r.ok).toBe(false);
  });
});
