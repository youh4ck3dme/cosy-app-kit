import { describe, expect, it } from "vitest";
import {
  composeSystem,
  formatClientContext,
  ARTIFACT_POLISH_ACTIONS,
  A11Y_POLISH_PROMPT,
  EXPORT_SHARE_POLISH_PROMPT,
  MOBILE_FIRST_POLISH_PROMPT,
  PROJECT_RUNTIME_POLISH_PROMPT,
  THEME_TOGGLE_POLISH_PROMPT,
  VISUAL_SYSTEM_POLISH_PROMPT,
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

  it("build includes project mode ZIP checklist", () => {
    const sys = composeSystem("build", "Base", "");
    expect(sys).toMatch(/Project mode/i);
    expect(sys).toMatch(/structuredClone/i);
    expect(sys).toMatch(/Pre-finish project ZIP checklist/i);
    expect(PROJECT_RUNTIME_POLISH_PROMPT).toMatch(/edit_file/i);
    expect(PROJECT_RUNTIME_POLISH_PROMPT).toMatch(/localStorage/i);
  });

  it("plan does not include build checklist header", () => {
    const sys = composeSystem("plan", "Base", "");
    expect(sys).toMatch(/PLAN MODE/i);
    expect(sys).not.toMatch(/Prefer tools when iterating/i);
    expect(sys).toMatch(/SHORT bullet/i);
  });

  it("polish prompt is actionable", () => {
    expect(MOBILE_FIRST_POLISH_PROMPT).toMatch(/edit_file/i);
    expect(MOBILE_FIRST_POLISH_PROMPT).toMatch(/390/);
  });

  it("exports artifact polish catalog with edit_file guidance", () => {
    expect(ARTIFACT_POLISH_ACTIONS.length).toBeGreaterThanOrEqual(5);
    const ids = ARTIFACT_POLISH_ACTIONS.map((a) => a.id);
    expect(ids).toEqual(expect.arrayContaining(["mobile-first", "theme", "a11y", "visual", "export"]));
    for (const action of ARTIFACT_POLISH_ACTIONS) {
      expect(action.prompt.length).toBeGreaterThan(80);
      expect(action.prompt).toMatch(/edit_file|CURRENT artifact|mobile-first/i);
    }
    expect(THEME_TOGGLE_POLISH_PROMPT).toMatch(/data-theme|localStorage/i);
    expect(A11Y_POLISH_PROMPT).toMatch(/focus-visible|aria-label|Escape/i);
    expect(VISUAL_SYSTEM_POLISH_PROMPT).toMatch(/CSS variables|token/i);
    expect(EXPORT_SHARE_POLISH_PROMPT).toMatch(/Download|print/i);
  });
});
