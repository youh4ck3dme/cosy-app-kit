import { describe, expect, it } from "vitest";
import { ensureHtmlDocument, sanitizeGeneratedPageHtml } from "./pages";

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

  it("rewrites dead page links and strips user-scalable=no", () => {
    const raw = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
</head><body>
<a href="team.html">Team</a>
<a href="about.html">About</a>
</body></html>`;
    const out = ensureHtmlDocument(raw);
    expect(out).toContain('href="contact.html"');
    expect(out).toContain('href="about.html"');
    expect(out).not.toContain("team.html");
    expect(out).not.toMatch(/user-scalable\s*=\s*no/i);
    expect(out).not.toMatch(/maximum-scale\s*=\s*1/i);
  });
});

describe("sanitizeGeneratedPageHtml", () => {
  it("leaves allowed hrefs", () => {
    const h = `<a href="index.html">H</a><a href="pricing.html">P</a>`;
    expect(sanitizeGeneratedPageHtml(h)).toBe(h);
  });
});
