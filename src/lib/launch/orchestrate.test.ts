import { describe, expect, it } from "vitest";
import { runLaunchPipeline } from "./orchestrate";
import { LaunchBlueprintSchema } from "./schema";
import type { GenerateTextFn } from "./blueprint";

const fixture = {
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
    home: { title: "Home", sections: ["Hero", "Features"] },
    about: { title: "About", sections: ["Story"] },
    contact: { title: "Contact", sections: ["Form"] },
    pricing: { title: "Pricing", sections: ["Plans"] },
  },
};

describe("runLaunchPipeline", () => {
  it("assembles 4 pages + blueprint with mocked LLM", async () => {
    let calls = 0;
    const generateText: GenerateTextFn = async ({ system, prompt }) => {
      calls += 1;
      // First call(s): blueprint JSON
      if (system.includes("STRICT JSON blueprint") || prompt.includes("Business brief")) {
        return JSON.stringify(fixture);
      }
      // Page workers
      const pageMatch = /Page id: (\w+)/.exec(prompt);
      const id = pageMatch?.[1] ?? "home";
      return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>${id}</title></head><body><h1>${id}</h1><a href="index.html">Home</a></body></html>`;
    };

    const result = await runLaunchPipeline("Mini web pre FieldOps SK s Home About Contact Pricing", {
      generateText,
    });

    expect(result.assembled.files.length).toBe(5);
    expect(result.assembled.files.filter((f) => f.path.endsWith(".html"))).toHaveLength(4);
    expect(result.assembled.entry_path).toBe("index.html");
    expect(result.blueprint.project.name).toBe("FieldOps SK");
    expect(result.timings.totalMs).toBeGreaterThanOrEqual(0);
    expect(result.pageFallbacks).toEqual([]);
    expect(calls).toBeGreaterThanOrEqual(5); // 1 blueprint + 4 pages
    expect(LaunchBlueprintSchema.safeParse(result.blueprint).success).toBe(true);
  });

  it("uses placeholder HTML when a page worker fails", async () => {
    let pageN = 0;
    const generateText: GenerateTextFn = async ({ system }) => {
      if (system.includes("STRICT JSON blueprint")) {
        return JSON.stringify(fixture);
      }
      pageN += 1;
      if (pageN === 2) throw new Error("codestral down");
      return `<!DOCTYPE html><html><head><title>ok</title></head><body>ok</body></html>`;
    };

    const result = await runLaunchPipeline("brief for site with four pages home about contact pricing", {
      generateText,
    });
    expect(result.pageFallbacks.length).toBe(1);
    expect(result.assembled.files.some((f) => f.content.includes("fallback"))).toBe(true);
  });
});
