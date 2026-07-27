import { Window as HappyWindow } from "happy-dom";

interface ViMock {
  fn: () => unknown;
  clearAllMocks: () => void;
  spyOn: (obj: unknown, method: string) => unknown;
  stubGlobal: (name: string, value: unknown) => void;
  unstubAllGlobals: () => void;
}

declare const vi: ViMock;

// Global test environment setup for both Vitest and Bun native test runner.
if (typeof window === "undefined") {
  const happyWindow = new HappyWindow();
  Object.assign(globalThis, {
    window: happyWindow as unknown as typeof window,
    document: happyWindow.document as unknown as typeof document,
    HTMLCanvasElement: happyWindow.HTMLCanvasElement as unknown as typeof HTMLCanvasElement,
    HTMLElement: happyWindow.HTMLElement as unknown as typeof HTMLElement,
    customElements: happyWindow.customElements as unknown as typeof customElements,
    localStorage: happyWindow.localStorage as unknown as typeof localStorage,
    URL: happyWindow.URL as unknown as typeof URL,
  });
}

// Map to store original global values when stubbed.
const __originalGlobals = new Map<string, unknown>();

// Helper to access globals without using `any`.
const globals = globalThis as unknown as Record<string, unknown>;

// Provide a minimal "vi" mock when Vitest globals are not present (e.g., Bun).
if (typeof vi === "undefined") {
  const noop = () => {};
  const viMock: ViMock = {
    fn: () => ({
      mockImplementation: noop,
      mockReturnValue: noop,
      mockResolvedValue: noop,
    }) as unknown,
    clearAllMocks: noop,
    spyOn: (obj: unknown, method: string) => ({
      mockReturnValue: noop,
    }) as unknown,
    stubGlobal: (name: string, value: unknown) => {
      if (!__originalGlobals.has(name)) {
        __originalGlobals.set(name, globals[name]);
      }
      globals[name] = value;
    },
    unstubAllGlobals: () => {
      for (const [k, v] of __originalGlobals.entries()) {
        globals[k] = v;
      }
      __originalGlobals.clear();
    },
  };
  (globalThis as unknown as Record<string, unknown>)["vi"] = viMock;
} else if (!(vi as unknown as { stubGlobal?: unknown }).stubGlobal) {
  // Polyfill stubGlobal / unstubAllGlobals for Bun's native test runner when "vi" exists.
  (vi as unknown as {
    stubGlobal?: (name: string, value: unknown) => void;
  }).stubGlobal = (name: string, value: unknown) => {
    if (!__originalGlobals.has(name)) {
      __originalGlobals.set(name, globals[name]);
    }
    globals[name] = value;
  };
  (vi as unknown as { unstubAllGlobals?: () => void }).unstubAllGlobals = () => {
    for (const [k, v] of __originalGlobals.entries()) {
      globals[k] = v;
    }
    __originalGlobals.clear();
  };
}
