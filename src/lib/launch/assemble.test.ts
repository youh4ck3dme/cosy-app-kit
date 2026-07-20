import { describe, expect, it } from "vitest";
import { assembleFiles } from "./assemble";
import type { LaunchBlueprint } from "./schema";

const fixture: LaunchBlueprint = {
  project: { name: "FieldOps SK", tagline: "Servis v teréne", locale: "sk" },
  brand: {
    primary: "#0f172a",
    accent: "#0ea5e9",
    background: "#f8fafc",
    font: "system-ui, sans-serif",
  },
  nav: [
    { label: "Home", href: "index.html" },
    { label: "About", href: "about.html" },
    { label: "Contact", href: "contact.html" },
    { label: "Pricing", href: "pricing.html" },
  ],
  pages: {
    home: { title: "Home", sections: ["Hero"] },
    about: { title: "About", sections: ["Story"] },
    contact: { title: "Contact", sections: ["Form"] },
    pricing: { title: "Pricing", sections: ["Plans"] },
  },
};

const pages = [
  { pageId: "home" as const, html: "<!DOCTYPE html><html><body>home</body></html>" },
  { pageId: "about" as const, html: "<!DOCTYPE html><html><body>about</body></html>" },
  { pageId: "contact" as const, html: "<!DOCTYPE html><html><body>contact</body></html>" },
  { pageId: "pricing" as const, html: "<!DOCTYPE html><html><body>pricing</body></html>" },
];

describe("assembleFiles", () => {
  it("builds 4 html pages + blueprint.json", () => {
    const out = assembleFiles(fixture, pages);
    expect(out.kind).toBe("html");
    expect(out.entry_path).toBe("index.html");
    expect(out.title).toBe("FieldOps SK");
    expect(out.files).toHaveLength(5);
    expect(out.files.map((f) => f.path)).toEqual([
      "index.html",
      "about.html",
      "contact.html",
      "pricing.html",
      "blueprint.json",
    ]);
    const bp = out.files.find((f) => f.path === "blueprint.json");
    expect(bp?.language).toBe("json");
    expect(JSON.parse(bp!.content).project.name).toBe("FieldOps SK");
  });

  it("throws when a required page is missing", () => {
    expect(() =>
      assembleFiles(
        fixture,
        pages.filter((p) => p.pageId !== "about"),
      ),
    ).toThrow(/Missing generated page: about/);
  });

  it("throws when a required page is empty", () => {
    expect(() =>
      assembleFiles(fixture, [
        ...pages.filter((p) => p.pageId !== "about"),
        { pageId: "about", html: "   " },
      ]),
    ).toThrow(/Missing generated page: about/);
  });

  it("throws when nav href has no matching file", () => {
    const badNav: LaunchBlueprint = {
      ...fixture,
      nav: [...fixture.nav, { label: "Blog", href: "blog.html" }],
    };
    expect(() => assembleFiles(badNav, pages)).toThrow(/Nav href «blog.html»/);
  });
});
