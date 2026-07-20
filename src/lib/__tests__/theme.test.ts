import { describe, expect, test } from "bun:test";
import { getStoredTheme, resolveTheme, THEME_BOOTSTRAP_SCRIPT } from "../theme";

describe("theme", () => {
  test("explicit themes resolve to themselves", () => {
    expect(resolveTheme("light")).toBe("light");
    expect(resolveTheme("dark")).toBe("dark");
  });

  test("getStoredTheme falls back to system without localStorage", () => {
    expect(getStoredTheme()).toBe("system");
  });

  test("bootstrap script stays in sync with the storage key and dark class", () => {
    expect(THEME_BOOTSTRAP_SCRIPT).toContain('"builder-theme"');
    expect(THEME_BOOTSTRAP_SCRIPT).toContain('classList.toggle("dark"');
    // Failure mode must default to dark (the brand default) rather than crash.
    expect(THEME_BOOTSTRAP_SCRIPT).toContain('classList.add("dark")');
  });
});
