import { describe, expect, it } from "vitest";
import { resolveTheme, isDarkResolved, THEME_BOOTSTRAP_SCRIPT } from "./theme";

describe("theme", () => {
  it("explicit themes resolve to themselves", () => {
    expect(resolveTheme("light")).toBe("light");
    expect(resolveTheme("dark")).toBe("dark");
    expect(resolveTheme("cosy")).toBe("cosy");
  });

  it("cosy brand theme is dark-resolved for UI chrome", () => {
    expect(isDarkResolved("cosy")).toBe(true);
    expect(isDarkResolved("dark")).toBe(true);
    expect(isDarkResolved("light")).toBe(false);
  });

  it("bootstrap script supports cosy + storage key", () => {
    expect(THEME_BOOTSTRAP_SCRIPT).toContain('"builder-theme"');
    expect(THEME_BOOTSTRAP_SCRIPT).toContain("theme-cosy");
    expect(THEME_BOOTSTRAP_SCRIPT).toContain('t==="cosy"');
    expect(THEME_BOOTSTRAP_SCRIPT).toContain('classList.toggle("dark"');
    expect(THEME_BOOTSTRAP_SCRIPT).toContain('classList.add("dark")');
  });

  it("system without window prefers light (SSR-safe)", () => {
    expect(resolveTheme("system")).toBe("light");
  });

  it("bootstrap defaults first paint to cosy brand", () => {
    expect(THEME_BOOTSTRAP_SCRIPT).toContain('!t||t==="cosy"');
    expect(THEME_BOOTSTRAP_SCRIPT).toContain("theme-cosy");
  });
});
