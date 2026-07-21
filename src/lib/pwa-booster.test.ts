import { describe, expect, it, beforeEach } from "vitest";
import {
  getPwaRuntimeStatus,
  isIosSafari,
  isStandaloneDisplay,
  resetPwaBoosterForTests,
} from "./pwa-booster";

describe("pwa-booster", () => {
  beforeEach(() => {
    resetPwaBoosterForTests();
  });

  it("reports runtime status in jsdom", () => {
    const status = getPwaRuntimeStatus();
    expect(status).toMatchObject({
      standalone: false,
      serviceWorker: false,
      installable: false,
    });
  });

  it("detects standalone display mode", () => {
    expect(isStandaloneDisplay()).toBe(false);
  });

  it("detects iOS Safari user agent", () => {
    const original = navigator.userAgent;
    Object.defineProperty(navigator, "userAgent", {
      value:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      configurable: true,
    });
    expect(isIosSafari()).toBe(true);
    Object.defineProperty(navigator, "userAgent", { value: original, configurable: true });
  });
});
