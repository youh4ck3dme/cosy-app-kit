import { describe, expect, it } from "vitest";
import { resolveTheme, THEME_BOOTSTRAP_SCRIPT } from "./theme";

describe("theme", () => {
  it("explicit themes resolve to themselves", () => {
    expect(resolveTheme("light")).toBe("light");
    expect(resolveTheme("dark")).toBe("dark");
  });

  it("bootstrap script stays in sync with storage key and dark class", () => {
    expect(THEME_BOOTSTRAP_SCRIPT).toContain('"builder-theme"');
    expect(THEME_BOOTSTRAP_SCRIPT).toContain('classList.toggle("dark"');
    expect(THEME_BOOTSTRAP_SCRIPT).toContain('classList.add("dark")');
  });

  it("system without window prefers light (SSR-safe)", () => {
    expect(resolveTheme("system")).toBe("light");
  });
});
