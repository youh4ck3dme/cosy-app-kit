import { describe, expect, it } from "vitest";
import {
  applyRewrite,
  applySearchReplace,
  MAX_FILE_BYTES,
  sanitizeRelativePath,
} from "@/lib/agent/patch";
import { assertSafeUrl, htmlToText } from "@/lib/agent/web";
import { toolResultToDataParts } from "@/lib/agent/stream-parts";
import {
  AVAILABLE_MODELS,
  BUILD_CODE_MODEL,
  DEFAULT_MODEL,
  resolveModelForMode,
} from "@/lib/models";
import {
  PROMPT_REV,
  composeSystem,
  formatClientContext,
  MOBILE_FIRST_POLISH_PROMPT,
} from "@/lib/agent/prompts";

describe("sanitizeRelativePath", () => {
  it("accepts nested relative paths", () => {
    expect(sanitizeRelativePath("src/App.tsx")).toEqual({
      ok: true,
      path: "src/App.tsx",
    });
  });
  it("rejects .. and absolute", () => {
    expect(sanitizeRelativePath("../x").ok).toBe(false);
    expect(sanitizeRelativePath("/etc/passwd").ok).toBe(false);
  });
});

describe("applySearchReplace", () => {
  it("replaces once by default", () => {
    const r = applySearchReplace({
      content: "aa aa",
      search: "aa",
      replace: "b",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.content).toBe("b aa");
      expect(r.replacements).toBe(1);
      expect(r.beforeSnippet).toContain("aa");
    }
  });
  it("replace_all", () => {
    const r = applySearchReplace({
      content: "aa aa",
      search: "aa",
      replace: "b",
      replace_all: true,
    });
    expect(r.ok && r.content).toBe("b b");
    expect(r.ok && r.replacements).toBe(2);
  });
  it("missing search fails", () => {
    expect(applySearchReplace({ content: "x", search: "nope" }).ok).toBe(false);
  });
  it("empty search fails", () => {
    const r = applySearchReplace({ content: "x", search: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/search is required/i);
  });
});

describe("applyRewrite", () => {
  it("rejects content over MAX_FILE_BYTES", () => {
    const r = applyRewrite("x".repeat(MAX_FILE_BYTES + 1));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/exceeds/);
  });
  it("accepts small rewrite", () => {
    const r = applyRewrite("hello");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.content).toBe("hello");
  });
});

describe("assertSafeUrl / htmlToText", () => {
  it("blocks localhost and private IPs", () => {
    expect(assertSafeUrl("http://localhost/x").ok).toBe(false);
    expect(assertSafeUrl("http://127.0.0.1/").ok).toBe(false);
    expect(assertSafeUrl("http://192.168.1.1/").ok).toBe(false);
    expect(assertSafeUrl("http://169.254.169.254/").ok).toBe(false);
  });
  it("allows public https", () => {
    const r = assertSafeUrl("https://example.com/docs");
    expect(r.ok).toBe(true);
  });
  it("strips scripts from html", () => {
    const t = htmlToText(`<html><script>alert(1)</script><p>Hi</p></html>`);
    expect(t).toContain("Hi");
    expect(t).not.toContain("alert");
  });
});

describe("toolResultToDataParts", () => {
  it("maps create_artifact", () => {
    const parts = toolResultToDataParts({
      toolName: "create_artifact",
      output: { ok: true, artifactId: "id-1", title: "Dash" },
    });
    expect(parts[0]?.type).toBe("data-artifact-created");
  });
  it("maps launch_site like create_artifact", () => {
    const parts = toolResultToDataParts({
      toolName: "launch_site",
      output: { ok: true, artifactId: "id-2", title: "Salon", kind: "html" },
    });
    expect(parts[0]?.type).toBe("data-artifact-created");
    expect(parts[0]?.data).toMatchObject({ artifactId: "id-2", title: "Salon" });
  });
  it("maps remember", () => {
    const parts = toolResultToDataParts({
      toolName: "remember",
      output: { ok: true, key: "brand", previous: "old" },
    });
    expect(parts[0]?.type).toBe("data-memory-saved");
  });
});

describe("resolveModelForMode matrix", () => {
  it("routes catalog ids", () => {
    for (const m of AVAILABLE_MODELS) {
      const build = resolveModelForMode(m.id, "build");
      const plan = resolveModelForMode(m.id, "plan");
      expect(typeof build).toBe("string");
      expect(typeof plan).toBe("string");
    }
    expect(resolveModelForMode(DEFAULT_MODEL, "build")).toBe(BUILD_CODE_MODEL);
    expect(resolveModelForMode(BUILD_CODE_MODEL, "plan")).toBe(DEFAULT_MODEL);
    expect(resolveModelForMode("pixtral-large-latest", "build")).toBe(
      "pixtral-large-latest",
    );
  });
});

describe("prompt_rev", () => {
  it("embeds rev in composeSystem", () => {
    expect(PROMPT_REV).toMatch(/2026/);
    expect(composeSystem("build", "Base", "")).toContain(PROMPT_REV);
  });

  it("appends client viewport context", () => {
    const block = formatClientContext({ hostWidth: 390, previewMode: "fluid" });
    expect(block).toMatch(/390px/);
    expect(composeSystem("build", "Base", "", block)).toContain("Client viewport");
  });

  it("exports mobile polish prompt", () => {
    expect(MOBILE_FIRST_POLISH_PROMPT).toMatch(/mobile-first/i);
  });
});
