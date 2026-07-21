import { describe, expect, it } from "vitest";
import {
  AVAILABLE_MODELS,
  BUILD_CODE_MODEL,
  DEFAULT_MODEL,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_TEMPERATURE,
  isMistralModelId,
  resolveKnownModelId,
  resolveModelForMode,
} from "./models";
import { composeSystem, PROMPT_REV } from "./agent/prompts";

describe("resolveKnownModelId", () => {
  it("passes through known Mistral catalog ids", () => {
    for (const m of AVAILABLE_MODELS) {
      expect(resolveKnownModelId(m.id)).toBe(m.id);
    }
  });

  it("maps null, empty, and whitespace to DEFAULT_MODEL", () => {
    expect(resolveKnownModelId(null)).toBe(DEFAULT_MODEL);
    expect(resolveKnownModelId(undefined)).toBe(DEFAULT_MODEL);
    expect(resolveKnownModelId("")).toBe(DEFAULT_MODEL);
    expect(resolveKnownModelId("   ")).toBe(DEFAULT_MODEL);
  });

  it("maps legacy OpenAI/Gemini/unknown ids to DEFAULT_MODEL", () => {
    expect(resolveKnownModelId("openai/gpt-4o")).toBe(DEFAULT_MODEL);
    expect(resolveKnownModelId("google/gemini-2.0-flash")).toBe(DEFAULT_MODEL);
    expect(resolveKnownModelId("gpt-4")).toBe(DEFAULT_MODEL);
    expect(resolveKnownModelId("not-a-real-model")).toBe(DEFAULT_MODEL);
  });

  it("trims known ids", () => {
    expect(resolveKnownModelId("  codestral-latest  ")).toBe("codestral-latest");
  });
});

describe("isMistralModelId", () => {
  it("returns true for catalog ids", () => {
    expect(isMistralModelId("mistral-large-latest")).toBe(true);
    expect(isMistralModelId("codestral-latest")).toBe(true);
  });

  it("returns false for empty or unknown", () => {
    expect(isMistralModelId(null)).toBe(false);
    expect(isMistralModelId("")).toBe(false);
    expect(isMistralModelId("openai/gpt-4o")).toBe(false);
  });
});

describe("resolveModelForMode", () => {
  it("Build bumps Large and Medium default to Codestral", () => {
    expect(resolveModelForMode("mistral-large-latest", "build")).toBe(BUILD_CODE_MODEL);
    expect(resolveModelForMode("mistral-medium-latest", "build")).toBe(BUILD_CODE_MODEL);
    expect(resolveModelForMode(null, "build")).toBe(BUILD_CODE_MODEL);
  });

  it("Build keeps explicit Small / Pixtral picks", () => {
    expect(resolveModelForMode("mistral-small-latest", "build")).toBe("mistral-small-latest");
    expect(resolveModelForMode("pixtral-large-latest", "build")).toBe("pixtral-large-latest");
  });

  it("Plan keeps Large; remaps Codestral to Large", () => {
    expect(resolveModelForMode("mistral-large-latest", "plan")).toBe(DEFAULT_MODEL);
    expect(resolveModelForMode("codestral-latest", "plan")).toBe(DEFAULT_MODEL);
    expect(resolveModelForMode("mistral-small-latest", "plan")).toBe("mistral-small-latest");
  });
});

/** Gear-wheel Agent Settings defaults must stay stable (DB seed + panel reset). */
describe("Agent settings defaults (gear wheel)", () => {
  it("keeps DEFAULT_SYSTEM_PROMPT and temperature for Settings panel", () => {
    expect(DEFAULT_SYSTEM_PROMPT.length).toBeGreaterThan(200);
    expect(DEFAULT_SYSTEM_PROMPT).toMatch(/Builder/i);
    expect(DEFAULT_SYSTEM_PROMPT).toMatch(/mobile-first/i);
    expect(DEFAULT_TEMPERATURE).toBe(0.7);
    expect(DEFAULT_MODEL).toBe("mistral-large-latest");
  });

  it("composeSystem preserves custom gear-wheel system prompt as base", () => {
    const custom = "You are a custom brand designer. Prefer coral palettes.";
    const sys = composeSystem("build", custom, "");
    expect(sys.startsWith(custom)).toBe(true);
    expect(sys).toContain(PROMPT_REV);
    expect(sys).toMatch(/Build mode/i);
  });

  it("composeSystem falls back to DEFAULT_SYSTEM_PROMPT when base empty", () => {
    const sys = composeSystem("build", "   ", "");
    expect(sys).toContain("You are Builder");
    expect(sys).toContain(PROMPT_REV);
  });
});
