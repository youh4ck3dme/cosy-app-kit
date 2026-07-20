import { describe, expect, it } from "vitest";
import {
  countCompleteFences,
  formatBuildProgress,
  partitionAssistantText,
  splitAroundArtifacts,
} from "./message-artifacts";

describe("partitionAssistantText", () => {
  it("keeps plain prose without fences", () => {
    const r = partitionAssistantText("Hello — sketching the layout.");
    expect(r.completeFenceCount).toBe(0);
    expect(r.incomplete).toBeNull();
    expect(r.chunks.join("")).toContain("Hello");
  });

  it("strips incomplete html fence and reports progress stats", () => {
    const body = "<!DOCTYPE html>\n<html><body>".repeat(50);
    const text = `Here we go.\n\`\`\`html\n${body}`;
    const r = partitionAssistantText(text);
    expect(r.completeFenceCount).toBe(0);
    expect(r.incomplete).not.toBeNull();
    expect(r.incomplete!.lang).toBe("html");
    expect(r.incomplete!.chars).toBe(body.length);
    expect(r.incomplete!.lines).toBeGreaterThan(1);
    // Prose kept; raw HTML body must not remain in display chunks
    expect(r.chunks.join("")).toContain("Here we go");
    expect(r.chunks.join("")).not.toContain("<!DOCTYPE");
  });

  it("does not treat complete fence as incomplete", () => {
    const text = "Done.\n```html\n<html></html>\n```\nEnjoy.";
    const r = partitionAssistantText(text);
    expect(r.completeFenceCount).toBe(1);
    expect(r.incomplete).toBeNull();
    expect(r.chunks.some((c) => c.includes("Done"))).toBe(true);
    expect(r.chunks.some((c) => c.includes("Enjoy"))).toBe(true);
    expect(r.chunks.join("")).not.toContain("<html>");
  });

  it("handles complete fence then a second incomplete stream", () => {
    const text =
      "v1 ready\n```html\n<html>a</html>\n```\nnext pass\n```html\n<html>b";
    const r = partitionAssistantText(text);
    expect(r.completeFenceCount).toBe(1);
    expect(r.incomplete?.lang).toBe("html");
    expect(r.incomplete?.chars).toBeGreaterThan(0);
    expect(r.chunks.join("")).toContain("next pass");
    expect(r.chunks.join("")).not.toContain("<html>b");
  });

  it("counts multi-file path fences as complete", () => {
    const text = "```ts path=app.ts\nconst x = 1;\n```";
    expect(countCompleteFences(text)).toBe(1);
    const r = partitionAssistantText(text);
    expect(r.completeFenceCount).toBe(1);
    expect(r.incomplete).toBeNull();
  });
});

describe("splitAroundArtifacts", () => {
  it("splits on complete fences into prose segments", () => {
    const parts = splitAroundArtifacts("A\n```html\n<html/>\n```\nB");
    expect(parts.length).toBe(2);
    expect(parts[0]).toContain("A");
    expect(parts[1]).toContain("B");
  });
});

describe("formatBuildProgress", () => {
  it("formats small and large sizes", () => {
    expect(formatBuildProgress(42, 3)).toBe("42 chars · 3 lines");
    expect(formatBuildProgress(2500, 80)).toBe("2.5k chars · 80 lines");
  });
});
