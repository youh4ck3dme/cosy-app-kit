import { describe, expect, it } from "vitest";
import { LaunchBlueprintSchema } from "./schema";
import { generateSharedShell, shellBaseStyles } from "./shell";

const fixture = LaunchBlueprintSchema.parse({
  project: { name: "Test Co", locale: "sk" },
  brand: {},
  nav: [
    { label: "Domov", href: "index.html" },
    { label: "O nás", href: "about.html" },
    { label: "Kontakt", href: "contact.html" },
    { label: "Cenník", href: "pricing.html" },
  ],
  pages: {
    home: { title: "H", sections: ["a"] },
    about: { title: "A", sections: ["a"] },
    contact: { title: "C", sections: ["a"] },
    pricing: { title: "P", sections: ["a"] },
  },
});

describe("generateSharedShell", () => {
  it("includes nav toggle + relative links + script", () => {
    const shell = generateSharedShell(fixture);
    expect(shell.headerHtml).toContain("data-nav-toggle");
    expect(shell.headerHtml).toContain('href="index.html"');
    expect(shell.headerHtml).toContain('href="pricing.html"');
    expect(shell.headerHtml).toContain("is-open");
    expect(shell.cssVars).toContain("--brand-primary");
  });

  it("mobile-first: nav hidden base, toggle visible, desktop row", () => {
    const shell = generateSharedShell(fixture);
    const css = shellBaseStyles(shell);
    // Base: nav not a permanent flex row without is-open
    expect(css).toMatch(/\.site-nav\{[^}]*display:\s*none/);
    expect(css).toMatch(/\.site-nav\.is-open\{[^}]*display:\s*flex/);
    // Desktop shows toggle none / nav row
    expect(css).toMatch(/@media \(min-width:\s*768px\)[\s\S]*\.site-nav-toggle\{[^}]*display:\s*none/);
  });
});
