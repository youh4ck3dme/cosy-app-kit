import { describe, expect, it } from "vitest";
import {
  LaunchBlueprintSchema,
  normalizeBlueprintNav,
  PAGE_PATHS,
} from "./schema";
import { parseBlueprintJson } from "./blueprint";
import { assembleFiles } from "./assemble";
import { generateSharedShell, placeholderPageHtml } from "./shell";

const validFixture = {
  project: { name: "Salon Luna", tagline: "Vlasy s dušou", locale: "sk" },
  brand: {
    primary: "#2c1810",
    accent: "#c45c26",
    background: "#faf8f5",
    font: "Georgia, serif",
  },
  nav: [
    { label: "Domov", href: "index.html" },
    { label: "O nás", href: "about.html" },
    { label: "Kontakt", href: "contact.html" },
    { label: "Cenník", href: "pricing.html" },
  ],
  pages: {
    home: {
      title: "Domov",
      headline: "Vitajte v Salóne Luna",
      sections: ["Hero s CTA", "Služby preview", "Recenzie"],
      cta: "Rezervovať",
    },
    about: {
      title: "O nás",
      sections: ["Príbeh salónu", "Tím"],
    },
    contact: {
      title: "Kontakt",
      sections: ["Adresa", "Hodiny", "Mapa"],
    },
    pricing: {
      title: "Cenník",
      sections: ["Strihanie 25€", "Farba od 45€", "Balíčky"],
    },
  },
  seo: { description: "Kaderníctvo Bratislava" },
};

describe("LaunchBlueprintSchema", () => {
  it("accepts a valid fixture", () => {
    const r = LaunchBlueprintSchema.safeParse(validFixture);
    expect(r.success).toBe(true);
  });

  it("rejects absolute nav href", () => {
    const bad = {
      ...validFixture,
      nav: [{ label: "About", href: "/about" }],
    };
    const r = LaunchBlueprintSchema.safeParse(bad);
    expect(r.success).toBe(false);
  });

  it("rejects parent traversal href", () => {
    const bad = {
      ...validFixture,
      nav: [{ label: "X", href: "../x.html" }],
    };
    const r = LaunchBlueprintSchema.safeParse(bad);
    expect(r.success).toBe(false);
  });

  it("parseBlueprintJson strips fences", () => {
    const raw = "```json\n" + JSON.stringify(validFixture) + "\n```";
    const bp = parseBlueprintJson(raw);
    expect(bp.project.name).toBe("Salon Luna");
    expect(bp.nav.some((n) => n.href === "index.html")).toBe(true);
  });
});

describe("normalizeBlueprintNav", () => {
  it("fills missing standard pages", () => {
    const base = LaunchBlueprintSchema.parse(validFixture);
    const partial = { ...base, nav: [{ label: "Home", href: "index.html" }] };
    const n = normalizeBlueprintNav(partial);
    expect(n.nav.map((x) => x.href)).toEqual([
      "index.html",
      "about.html",
      "contact.html",
      "pricing.html",
    ]);
  });
});

describe("assembleFiles", () => {
  it("builds 4 html + blueprint.json and covers nav", () => {
    const bp = LaunchBlueprintSchema.parse(validFixture);
    const shell = generateSharedShell(bp);
    const pages = (["home", "about", "contact", "pricing"] as const).map((id) => ({
      pageId: id,
      html: placeholderPageHtml(id, bp, shell, "test"),
    }));
    const assembled = assembleFiles(bp, pages);
    expect(assembled.entry_path).toBe(PAGE_PATHS.home);
    expect(assembled.files.map((f) => f.path).sort()).toEqual(
      ["about.html", "blueprint.json", "contact.html", "index.html", "pricing.html"].sort(),
    );
    expect(assembled.title).toBe("Salon Luna");
  });
});
