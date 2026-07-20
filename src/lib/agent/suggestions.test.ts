import { describe, expect, it } from "vitest";
import {
  MAX_SUGGESTIONS,
  parseSuggestionLines,
  staticSuggestionFallback,
  buildSuggestUserPrompt,
} from "@/lib/agent/suggestions";

describe("parseSuggestionLines", () => {
  it("parses bullets and numbers", () => {
    const raw = `
1. Add dark mode toggle
- Improve mobile sidebar
* Export as ZIP
`;
    expect(parseSuggestionLines(raw)).toEqual([
      "Add dark mode toggle",
      "Improve mobile sidebar",
      "Export as ZIP",
    ]);
  });

  it("dedupes and caps", () => {
    const raw = ["Same thing", "Same thing", "Other", "Third", "Fourth"].join("\n");
    expect(parseSuggestionLines(raw, 3)).toHaveLength(3);
  });

  it("drops preamble noise", () => {
    expect(parseSuggestionLines("Here are suggestions:\nMake it blue\n").length).toBeGreaterThan(0);
  });
});

describe("staticSuggestionFallback", () => {
  it("returns up to MAX", () => {
    expect(staticSuggestionFallback().length).toBeLessThanOrEqual(MAX_SUGGESTIONS);
    expect(staticSuggestionFallback()[0]?.length).toBeGreaterThan(4);
  });
});

describe("buildSuggestUserPrompt", () => {
  it("clips long text", () => {
    const p = buildSuggestUserPrompt("x".repeat(5000));
    expect(p.length).toBeLessThan(4000);
  });
});
