import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  DEFAULT_APP_PREFERENCES,
  getAppPreferences,
  setAppPreferences,
  syncSpeedModeDom,
} from "./app-preferences";

describe("app-preferences", () => {
  const store: Record<string, string> = {};
  const toggleAttribute = vi.fn();

  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);
    toggleAttribute.mockReset();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      clear: () => {
        Object.keys(store).forEach((k) => delete store[k]);
      },
    });
    // Partial document stub — do NOT replace createElement used by other suites under bun
    const doc = typeof document !== "undefined" ? document : undefined;
    if (doc?.documentElement) {
      vi.spyOn(doc.documentElement, "toggleAttribute").mockImplementation(toggleAttribute);
    } else {
      vi.stubGlobal("document", {
        documentElement: {
          toggleAttribute,
          removeAttribute: vi.fn(),
          hasAttribute: vi.fn(() => false),
        },
        createElement: (tag: string) => {
          throw new Error(`unexpected createElement(${tag}) in app-preferences test`);
        },
      });
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns defaults when storage is empty", () => {
    expect(getAppPreferences()).toEqual(DEFAULT_APP_PREFERENCES);
  });

  it("merges partial updates", () => {
    setAppPreferences({ speedMode: true, hapticsEnabled: false });
    expect(getAppPreferences()).toMatchObject({
      speedMode: true,
      hapticsEnabled: false,
      nativeShellLock: true,
      pwaBooster: true,
    });
  });

  it("syncs speed mode attribute on html", () => {
    syncSpeedModeDom(true);
    expect(toggleAttribute).toHaveBeenCalledWith("data-speed", true);
  });
});
