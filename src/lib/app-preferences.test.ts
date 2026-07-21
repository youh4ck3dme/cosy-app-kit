import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  DEFAULT_APP_PREFERENCES,
  getAppPreferences,
  setAppPreferences,
  syncSpeedModeDom,
} from "./app-preferences";

describe("app-preferences", () => {
  const store: Record<string, string> = {};

  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);
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
    vi.stubGlobal("document", {
      documentElement: {
        toggleAttribute: vi.fn(),
        removeAttribute: vi.fn(),
        hasAttribute: vi.fn(() => false),
      },
    });
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
    const el = document.documentElement as unknown as {
      toggleAttribute: ReturnType<typeof vi.fn>;
    };
    syncSpeedModeDom(true);
    expect(el.toggleAttribute).toHaveBeenCalledWith("data-speed", true);
  });
});
