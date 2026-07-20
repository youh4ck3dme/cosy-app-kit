import { describe, expect, it } from "vitest";
import { extractArtifacts, parseMeta } from "@/lib/agent/artifacts";
import { composeSystem } from "@/lib/agent/prompts";
import { formatMemoryBlock } from "@/lib/agent/memory";
import {
  backoffDelaysMs,
  classifyChatError,
  parseRetryAfterSeconds,
  userFacingChatError,
} from "@/lib/agent/error-handling";
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
    const arts = extractArtifacts("```markdown\n# Hello\n```");
    expect(arts[0]?.kind).toBe("markdown");
  });

  it("returns empty for no fences", () => {
    expect(extractArtifacts("just chat")).toEqual([]);
  });

  it("respects title= in meta", () => {
    const arts = extractArtifacts('```html title="Landing"\n<html></html>\n```');
    expect(arts[0]?.title).toMatch(/Landing|html/i);
  });

  it("handles path= with quotes", () => {
    const arts = extractArtifacts('```tsx path="src/App.tsx"\nexport {}\n```');
    expect(arts[0]?.files?.[0]?.path).toBe("src/App.tsx");
  });
});

describe("parseMeta", () => {
  it("parses lang and path", () => {
    expect(parseMeta('html path=index.html')).toMatchObject({
      lang: "html",
      path: "index.html",
    });
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

  it("plan mode has no fence suffix instruction for full HTML emit as primary", () => {
    const s = composeSystem("plan", "Base", "");
    expect(s).toMatch(/Do NOT emit fenced HTML/i);
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

  it("empty rows → empty string", () => {
    expect(formatMemoryBlock([])).toBe("");
  });

  it("stringifies object values", () => {
    const block = formatMemoryBlock([
      { id: "1", key: "plan", value: { a: 1 }, updated_at: "" },
    ]);
    expect(block).toContain("plan");
    expect(block).toContain('"a"');
  });
});

describe("error handling", () => {
  it("classifies rate limits", () => {
    expect(classifyChatError("429 rate limit")).toBe("rate_limit");
    expect(userFacingChatError("Too many requests")).toMatch(/Too many requests/i);
  });

  it("classifies 402 credits", () => {
    expect(classifyChatError("402 payment required")).toBe("credits");
    expect(userFacingChatError("quota exceeded")).toMatch(/credits|billing|Mistral/i);
  });

  it("classifies auth", () => {
    expect(classifyChatError("401 unauthorized")).toBe("auth");
  });

  it("classifies offline", () => {
    expect(classifyChatError("Failed to fetch")).toBe("offline");
  });

  it("classifies 5xx", () => {
    expect(classifyChatError("503 unavailable")).toBe("unavailable");
  });

  it("parseRetryAfterSeconds", () => {
    expect(parseRetryAfterSeconds("Retry-After: 30")).toBe(30);
    expect(parseRetryAfterSeconds("in 12 s")).toBe(12);
    expect(parseRetryAfterSeconds("nope")).toBeNull();
  });

  it("backoff delays", () => {
    expect(backoffDelaysMs()).toEqual([800, 1600, 3200]);
  });
});

describe("model routing", () => {
  it("routes Large default to Codestral in build", () => {
    expect(resolveModelForMode(DEFAULT_MODEL, "build")).toBe(BUILD_CODE_MODEL);
  });
  it("keeps explicit Small in build", () => {
    expect(resolveModelForMode("mistral-small-latest", "build")).toBe("mistral-small-latest");
  });
  it("maps unknown/legacy ids to default", () => {
    expect(resolveModelForMode("openai/gpt-4", "build")).toBe(BUILD_CODE_MODEL);
  });
});
