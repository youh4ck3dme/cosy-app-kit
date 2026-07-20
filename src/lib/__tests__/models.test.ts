import { describe, expect, test } from "bun:test";
import { AVAILABLE_MODELS, DEFAULT_MODEL, isMistralModelId, resolveKnownModelId } from "../models";

describe("resolveKnownModelId", () => {
  test("keeps every catalog model id as-is", () => {
    for (const m of AVAILABLE_MODELS) {
      expect(resolveKnownModelId(m.id)).toBe(m.id);
    }
  });

  test("maps legacy provider ids to the Mistral default", () => {
    expect(resolveKnownModelId("openai/gpt-5.5")).toBe(DEFAULT_MODEL);
    expect(resolveKnownModelId("gemini-2.5-flash")).toBe(DEFAULT_MODEL);
    expect(resolveKnownModelId("gpt-4o")).toBe(DEFAULT_MODEL);
  });

  test("handles null, undefined, and whitespace", () => {
    expect(resolveKnownModelId(null)).toBe(DEFAULT_MODEL);
    expect(resolveKnownModelId(undefined)).toBe(DEFAULT_MODEL);
    expect(resolveKnownModelId("   ")).toBe(DEFAULT_MODEL);
  });
});

describe("isMistralModelId", () => {
  test("accepts catalog ids and rejects everything else", () => {
    expect(isMistralModelId(DEFAULT_MODEL)).toBe(true);
    expect(isMistralModelId("openai/gpt-5.5")).toBe(false);
    expect(isMistralModelId(null)).toBe(false);
  });
});
