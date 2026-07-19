import { describe, expect, it } from "vitest";
import { extractArtifacts } from "@/lib/agent/artifacts";
import { composeSystem } from "@/lib/agent/prompts";
import { formatMemoryBlock } from "@/lib/agent/memory";
import { classifyChatError, userFacingChatError } from "@/lib/agent/error-handling";
import { resolveModelForMode, BUILD_CODE_MODEL, DEFAULT_MODEL } from "@/lib/models";

describe("extractArtifacts", () => {
  it("parses a single html fence", () => {
    const text = `Here you go:\n\`\`\`html\n<!DOCTYPE html><html><title>Hi</title></html>\n\`\`\`\n`;
    const arts = extractArtifacts(text);
    expect(arts).toHaveLength(1);
    expect(arts[0]?.kind).toBe("html");
    expect(arts[0]?.entry_path).toBe("index.html");
    expect(arts[0]?.content).toContain("<!DOCTYPE html>");
  });

  it("bundles consecutive path= blocks", () => {
    const text = `
\`\`\`html path=index.html
<html></html>
\`\`\`
\`\`\`css path=styles.css
body{}
\`\`\`
`;
    const arts = extractArtifacts(text);
    expect(arts).toHaveLength(1);
    expect(arts[0]?.files).toHaveLength(2);
    expect(arts[0]?.entry_path).toBe("index.html");
  });

  it("parses markdown fences", () => {
    const arts = extractArtifacts("\`\`\`markdown\n# Hello\n\`\`\`");
    expect(arts[0]?.kind).toBe("markdown");
  });
});

describe("composeSystem", () => {
  it("includes plan constraints in plan mode", () => {
    const s = composeSystem("plan", "Base", "");
    expect(s).toMatch(/PLAN MODE/i);
    expect(s).toMatch(/Do NOT write full code/i);
  });

  it("injects memory block", () => {
    const s = composeSystem("build", "Base", "## User preferences\n- brand: Acme");
    expect(s).toContain("brand: Acme");
  });
});

describe("memory format", () => {
  it("formats rows", () => {
    const block = formatMemoryBlock([
      { id: "1", key: "tone", value: "calm", updated_at: new Date().toISOString() },
    ]);
    expect(block).toContain("tone");
    expect(block).toContain("calm");
  });
});

describe("error handling", () => {
  it("classifies rate limits", () => {
    expect(classifyChatError("429 rate limit")).toBe("rate_limit");
    expect(userFacingChatError("Too many requests")).toMatch(/Too many requests/i);
  });
});

describe("model routing", () => {
  it("routes Large default to Codestral in build", () => {
    expect(resolveModelForMode(DEFAULT_MODEL, "build")).toBe(BUILD_CODE_MODEL);
  });
  it("keeps explicit Small in build", () => {
    expect(resolveModelForMode("mistral-small-latest", "build")).toBe("mistral-small-latest");
  });
});
