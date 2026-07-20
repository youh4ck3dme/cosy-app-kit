import { describe, expect, it } from "vitest";
import { BlueprintError, extractJsonText, parseBlueprintJson } from "./blueprint";

const validBlueprint = {
  project: { name: "Acme", locale: "sk" },
  brand: {},
  nav: [
    { label: "Home", href: "index.html" },
    { label: "About", href: "about.html" },
  ],
  pages: {
    home: { title: "Home", sections: ["Hero"] },
    about: { title: "About", sections: ["Story"] },
    contact: { title: "Contact", sections: ["Form"] },
    pricing: { title: "Pricing", sections: ["Plans"] },
  },
};

describe("extractJsonText", () => {
  it("returns raw JSON trimmed", () => {
    expect(extractJsonText('  {"a":1}  ')).toBe('{"a":1}');
  });

  it("strips markdown json fences", () => {
    const raw = "```json\n{\"a\":1}\n```";
    expect(extractJsonText(raw)).toBe('{"a":1}');
  });

  it("extracts object from prose wrapper", () => {
    const raw = 'Here is the blueprint:\n{"a":1}\nThanks';
    expect(extractJsonText(raw)).toBe('{"a":1}');
  });
});

describe("parseBlueprintJson", () => {
  it("parses valid blueprint JSON", () => {
    const bp = parseBlueprintJson(JSON.stringify(validBlueprint));
    expect(bp.project.name).toBe("Acme");
    expect(bp.pages.home.title).toBe("Home");
  });

  it("parses fenced JSON", () => {
    const bp = parseBlueprintJson("```json\n" + JSON.stringify(validBlueprint) + "\n```");
    expect(bp.project.name).toBe("Acme");
  });

  it("throws BlueprintError on invalid JSON", () => {
    expect(() => parseBlueprintJson("{not-json")).toThrow(BlueprintError);
    try {
      parseBlueprintJson("{not-json");
    } catch (e) {
      expect(e).toBeInstanceOf(BlueprintError);
      expect((e as BlueprintError).message).toMatch(/parse failed/i);
    }
  });

  it("throws BlueprintError on schema failure", () => {
    expect(() => parseBlueprintJson(JSON.stringify({ project: { name: "x" } }))).toThrow(
      BlueprintError,
    );
    try {
      parseBlueprintJson(JSON.stringify({ project: { name: "x" } }));
    } catch (e) {
      expect((e as BlueprintError).message).toMatch(/schema validation failed/i);
    }
  });
});
