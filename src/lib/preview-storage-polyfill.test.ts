import { describe, expect, it } from "vitest";
import {
  bridgePrecedesArtifactScripts,
  createMemoryStorage,
  injectScriptIntoHtmlHead,
} from "./preview-storage-polyfill";

describe("createMemoryStorage", () => {
  it("implements get/set/remove/clear", () => {
    const s = createMemoryStorage();
    expect(s.getItem("a")).toBe(null);
    s.setItem("a", "1");
    expect(s.getItem("a")).toBe("1");
    expect(s.length).toBe(1);
    expect(s.key(0)).toBe("a");
    s.setItem("b", "2");
    expect(s.length).toBe(2);
    s.removeItem("a");
    expect(s.getItem("a")).toBe(null);
    expect(s.length).toBe(1);
    s.clear();
    expect(s.length).toBe(0);
  });

  it("stringifies values like real Storage", () => {
    const s = createMemoryStorage();
    s.setItem("n", 42 as unknown as string);
    expect(s.getItem("n")).toBe("42");
  });
});

describe("injectScriptIntoHtmlHead", () => {
  const bridge = `<script>/*BRIDGE*/</script>`;

  it("injects after <head>", () => {
    const out = injectScriptIntoHtmlHead(
      `<!DOCTYPE html><html><head><title>x</title></head><body><script>localStorage.getItem("t")</script></body></html>`,
      bridge,
    );
    expect(out).toMatch(/<head[^>]*>\s*<script>\/\*BRIDGE\*\//i);
    expect(bridgePrecedesArtifactScripts(out, "/*BRIDGE*/")).toBe(true);
  });

  it("prepends when no head", () => {
    const out = injectScriptIntoHtmlHead(`<div>hi</div>`, bridge);
    expect(out.startsWith(bridge)).toBe(true);
  });
});
