import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getStoredTheme,
  resolveTheme,
  setTheme,
  THEME_BOOTSTRAP_SCRIPT,
} from "./theme";

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
});

describe("resolveTheme with system preference", () => {
  afterEach(() => {
    // @ts-expect-error test cleanup
    delete globalThis.window;
  });

  it("resolves to dark when the OS prefers dark", () => {
    // @ts-expect-error mock
    globalThis.window = {
      matchMedia: (query: string) => ({ matches: true, media: query }),
    };
    expect(resolveTheme("system")).toBe("dark");
  });

  it("resolves to light when the OS prefers light", () => {
    // @ts-expect-error mock
    globalThis.window = {
      matchMedia: (query: string) => ({ matches: false, media: query }),
    };
    expect(resolveTheme("system")).toBe("light");
  });
});

describe("getStoredTheme / setTheme with mocked localStorage", () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = new Map();
    // @ts-expect-error mock
    globalThis.localStorage = {
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    };
    // @ts-expect-error mock
    globalThis.window = {
      matchMedia: () => ({ matches: true }),
      dispatchEvent: () => true,
      document: {
        documentElement: {
          classList: { toggle: () => {}, add: () => {}, remove: () => {} },
        },
        querySelector: () => null,
      },
    };
    // setTheme uses document from global document in browser; polyfill
    // @ts-expect-error mock
    globalThis.document = globalThis.window.document;
  });

  afterEach(() => {
    // @ts-expect-error cleanup
    delete globalThis.localStorage;
    // @ts-expect-error cleanup
    delete globalThis.window;
    // @ts-expect-error cleanup
    delete globalThis.document;
  });

  it("returns stored light/dark and falls back to system", () => {
    store.set("builder-theme", "light");
    expect(getStoredTheme()).toBe("light");
    store.set("builder-theme", "dark");
    expect(getStoredTheme()).toBe("dark");
    store.set("builder-theme", "blue");
    expect(getStoredTheme()).toBe("system");
    store.clear();
    expect(getStoredTheme()).toBe("system");
  });

  it("setTheme persists light and clears on system", () => {
    setTheme("light");
    expect(store.get("builder-theme")).toBe("light");
    setTheme("system");
    expect(store.has("builder-theme")).toBe(false);
  });
});
