import { describe, expect, it } from "vitest";
import { ensureHtmlDocument } from "./pages";

describe("ensureHtmlDocument", () => {
  it("accepts a doctype document", () => {
    const html = "<!DOCTYPE html><html><body>ok</body></html>";
    expect(ensureHtmlDocument(html)).toBe(html);
  });

  it("accepts html without doctype", () => {
    const html = "<html><head></head><body>x</body></html>";
    expect(ensureHtmlDocument(html)).toBe(html);
  });

  it("strips markdown html fences", () => {
    const inner = "<!DOCTYPE html><html><body>fenced</body></html>";
    expect(ensureHtmlDocument("```html\n" + inner + "\n```")).toBe(inner);
  });

  it("rejects empty output", () => {
    expect(() => ensureHtmlDocument("")).toThrow(/Empty HTML/);
    // Fence strip may leave a non-document string rather than empty
    expect(() => ensureHtmlDocument("```html\n\n```")).toThrow(
      /Empty HTML|not an HTML document/,
    );
  });

  it("rejects non-HTML snippets", () => {
    expect(() => ensureHtmlDocument("just a paragraph")).toThrow(/not an HTML document/);
  });
});
