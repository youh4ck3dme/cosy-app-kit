import { describe, expect, it } from "vitest";
import { SEMANTIC_INTENTS } from "./types";
import { renderProductSkeleton, REQUIRED_SKELETON_MARKERS } from "./skeletons";

describe("renderProductSkeleton", () => {
  for (const intent of SEMANTIC_INTENTS) {
    it(`emits scorecard-ready single-file HTML for ${intent}`, () => {
      const html = renderProductSkeleton({ brand: "Demo Co", intent });
      expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
      for (const marker of REQUIRED_SKELETON_MARKERS) {
        expect(html).toContain(marker);
      }
      expect(html).toContain('data-nf-skeleton="' + intent + '"');
      expect(html).toContain("Demo Co");
      expect(html).toMatch(/@media\s*\(\s*min-width:\s*768px\s*\)|@media\s*\(\s*max-width:/);
      expect(html).toMatch(/class="empty"|empty state/i);
      // No CDN scripts
      expect(html).not.toMatch(/cdn\.jsdelivr|unpkg\.com|cdnjs\.cloudflare/i);
      // Reasonable size for canvas first paint
      expect(html.length).toBeGreaterThan(1500);
      expect(html.length).toBeLessThan(80_000);
    });
  }

  it("booking includes flow + staff + cancel shells (D2/D5/D6)", () => {
    const html = renderProductSkeleton({ brand: "Blade", intent: "booking" });
    expect(html).toContain("booking-steps");
    expect(html).toContain("staff-ops");
    expect(html).toContain("cancel-self-serve");
    expect(html).toContain("slot-grid");
  });

  it("escapes brand HTML", () => {
    const html = renderProductSkeleton({
      brand: "<img src=x onerror=alert(1)>",
      intent: "landing",
    });
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img");
  });
});
