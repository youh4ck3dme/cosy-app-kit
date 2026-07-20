import { describe, expect, it } from "vitest";
import {
  composeSystem,
  formatClientContext,
  MOBILE_FIRST_POLISH_PROMPT,
  PROMPT_REV,
} from "./prompts";

describe("formatClientContext", () => {
  it("returns empty for empty input", () => {
    expect(formatClientContext(null)).toBe("");
    expect(formatClientContext({})).toBe("");
  });

  it("includes width and mode", () => {
    const s = formatClientContext({ hostWidth: 390.4, previewMode: "fluid" });
    expect(s).toContain("390px");
    expect(s).toContain("fluid");
    expect(s).toContain("Client viewport");
  });

  it("truncates wild mode strings", () => {
    const s = formatClientContext({
      previewMode: "x".repeat(100),
      hostWidth: 800,
    });
    expect(s.length).toBeLessThan(400);
  });
});

describe("composeSystem M3", () => {
  it("build includes mobile checklist and rev", () => {
    const sys = composeSystem("build", "Base", "");
    expect(sys).toContain(PROMPT_REV);
    expect(sys).toMatch(/Pre-finish mobile checklist/i);
  });

  it("plan does not include build checklist header", () => {
    const sys = composeSystem("plan", "Base", "");
    expect(sys).toMatch(/PLAN MODE/i);
    expect(sys).not.toMatch(/Prefer tools when iterating/i);
  });

  it("polish prompt is actionable", () => {
    expect(MOBILE_FIRST_POLISH_PROMPT).toMatch(/edit_file/i);
    expect(MOBILE_FIRST_POLISH_PROMPT).toMatch(/390/);
  });
});
