import { describe, expect, test } from "bun:test";
import { STARTER_TEMPLATES } from "../templates";

describe("STARTER_TEMPLATES", () => {
  test("has at least four templates with unique ids", () => {
    expect(STARTER_TEMPLATES.length).toBeGreaterThanOrEqual(4);
    const ids = STARTER_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("every template is fully populated", () => {
    for (const t of STARTER_TEMPLATES) {
      expect(t.title.trim().length).toBeGreaterThan(0);
      expect(t.description.trim().length).toBeGreaterThan(0);
      expect(t.prompt.trim().length).toBeGreaterThan(20);
      expect(t.icon).toBeDefined();
    }
  });

  test("prompts ask for self-contained HTML the canvas can render", () => {
    for (const t of STARTER_TEMPLATES) {
      expect(t.prompt.toLowerCase()).toContain("html");
    }
  });
});
