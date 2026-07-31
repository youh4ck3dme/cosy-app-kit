// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CosyLogo } from "./CosyLogo";

describe("CosyLogo", () => {
  it("renders spatial mark + COSY.AI wordmark by default", () => {
    const html = renderToStaticMarkup(<CosyLogo />);
    expect(html).toContain("COSY");
    expect(html).toContain(".AI");
    expect(html).toContain('viewBox="0 0 64 64"');
  });

  it("can hide wordmark for favicon-style mark only", () => {
    const html = renderToStaticMarkup(<CosyLogo showWordmark={false} size={28} />);
    expect(html).not.toContain("font-extrabold");
    expect(html).toContain('aria-label="COSY.AI"');
    expect(html).toContain("svg");
  });

  it("supports monogram and mono variants", () => {
    const mono = renderToStaticMarkup(<CosyLogo variant="mono" showWordmark={false} />);
    const monogram = renderToStaticMarkup(<CosyLogo variant="monogram" showWordmark={false} />);
    expect(mono).toContain("#09090B");
    expect(monogram).toContain("cosy_mono_grad");
  });
});
