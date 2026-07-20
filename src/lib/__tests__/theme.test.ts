import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { getStoredTheme, resolveTheme, setTheme, THEME_BOOTSTRAP_SCRIPT } from "../theme";

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

describe("resolveTheme with system preference", () => {
  afterEach(() => {
    delete (globalThis as any).window;
  });

  test("resolves to dark when the OS prefers dark", () => {
    (globalThis as any).window = {
      matchMedia: (query: string) => ({ matches: true, media: query }),
    };
    expect(resolveTheme("system")).toBe("dark");
  });

  test("resolves to light when the OS prefers light", () => {
    (globalThis as any).window = {
      matchMedia: (query: string) => ({ matches: false, media: query }),
    };
    expect(resolveTheme("system")).toBe("light");
  });

  test("resolves to light when window is unavailable (SSR)", () => {
    delete (globalThis as any).window;
    expect(resolveTheme("system")).toBe("light");
  });
});

describe("getStoredTheme with a mocked localStorage", () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = new Map();
    (globalThis as any).localStorage = {
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    };
  });

  afterEach(() => {
    delete (globalThis as any).localStorage;
  });

  test("returns the stored light theme", () => {
    store.set("builder-theme", "light");
    expect(getStoredTheme()).toBe("light");
  });

  test("returns the stored dark theme", () => {
    store.set("builder-theme", "dark");
    expect(getStoredTheme()).toBe("dark");
  });

  test("falls back to system for unrecognized stored values", () => {
    store.set("builder-theme", "blue");
    expect(getStoredTheme()).toBe("system");
  });

  test("falls back to system when nothing is stored", () => {
    expect(getStoredTheme()).toBe("system");
  });
});

describe("setTheme", () => {
  let store: Map<string, string>;
  let classListDark: boolean | undefined;
  let metaContent: string | null;
  let hasMetaTag: boolean;
  let dispatched: CustomEvent[];

  beforeEach(() => {
    store = new Map();
    classListDark = undefined;
    metaContent = null;
    hasMetaTag = true;
    dispatched = [];

    (globalThis as any).localStorage = {
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    };

    (globalThis as any).document = {
      documentElement: {
        classList: {
          toggle: (cls: string, force: boolean) => {
            if (cls === "dark") classListDark = force;
          },
        },
      },
      querySelector: () =>
        hasMetaTag
          ? {
              setAttribute: (_name: string, value: string) => {
                metaContent = value;
              },
            }
          : null,
    };

    (globalThis as any).window = {
      matchMedia: () => ({ matches: false }),
      dispatchEvent: (evt: CustomEvent) => dispatched.push(evt),
    };
  });

  afterEach(() => {
    delete (globalThis as any).localStorage;
    delete (globalThis as any).document;
    delete (globalThis as any).window;
  });

  test("persists explicit light/dark selections and flips the dark class", () => {
    setTheme("dark");
    expect(store.get("builder-theme")).toBe("dark");
    expect(classListDark).toBe(true);

    setTheme("light");
    expect(store.get("builder-theme")).toBe("light");
    expect(classListDark).toBe(false);
  });

  test("clears the stored preference for system", () => {
    store.set("builder-theme", "dark");
    setTheme("system");
    expect(store.has("builder-theme")).toBe(false);
  });

  test("updates the theme-color meta tag to match the resolved theme", () => {
    setTheme("dark");
    expect(metaContent).toBe("#0e0f14");
    setTheme("light");
    expect(metaContent).toBe("#fafafa");
  });

  test("dispatches a change event so other components can react", () => {
    setTheme("dark");
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].type).toBe("builder-theme-change");
  });

  test("does not throw when localStorage access is blocked (private mode)", () => {
    (globalThis as any).localStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    expect(() => setTheme("dark")).not.toThrow();
    // Theme still applies to the DOM for this page load even though persistence failed.
    expect(classListDark).toBe(true);
  });

  test("does not throw when the theme-color meta tag is missing", () => {
    hasMetaTag = false;
    expect(() => setTheme("dark")).not.toThrow();
    expect(classListDark).toBe(true);
    expect(metaContent).toBeNull();
  });
});

describe("THEME_BOOTSTRAP_SCRIPT execution", () => {
  /**
   * Runs the inline bootstrap script with injected localStorage/matchMedia/document
   * stand-ins. Using `new Function` with these names as parameters shadows the
   * real globals, so this exercises the exact source string shipped to <head>
   * without needing a DOM.
   */
  function run(getItem: () => string | null, matches: boolean) {
    let dark: boolean | undefined;
    let addedDarkOnCatch = false;
    const classList = {
      toggle: (_cls: string, force: boolean) => {
        dark = force;
      },
      add: (_cls: string) => {
        addedDarkOnCatch = true;
      },
    };
    const document = { documentElement: { classList } };
    const localStorage = { getItem };
    const matchMedia = () => ({ matches });
    const fn = new Function("localStorage", "matchMedia", "document", THEME_BOOTSTRAP_SCRIPT);
    fn(localStorage, matchMedia, document);
    return { dark, addedDarkOnCatch };
  }

  test("stored dark wins regardless of OS preference", () => {
    expect(run(() => "dark", false).dark).toBe(true);
    expect(run(() => "dark", true).dark).toBe(true);
  });

  test("stored light wins regardless of OS preference", () => {
    expect(run(() => "light", true).dark).toBe(false);
    expect(run(() => "light", false).dark).toBe(false);
  });

  test("falls back to OS preference when nothing is stored", () => {
    expect(run(() => null, true).dark).toBe(true);
    expect(run(() => null, false).dark).toBe(false);
  });

  test("falls back to OS preference for unrecognized stored values", () => {
    expect(run(() => "blue", true).dark).toBe(true);
    expect(run(() => "blue", false).dark).toBe(false);
  });

  test("defaults to dark and does not crash if localStorage access throws", () => {
    const { dark, addedDarkOnCatch } = run(() => {
      throw new Error("blocked");
    }, false);
    expect(addedDarkOnCatch).toBe(true);
    expect(dark).toBeUndefined();
  });
});
