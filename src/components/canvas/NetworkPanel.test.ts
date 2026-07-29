import { describe, expect, it } from "vitest";

import { isFail, isOk, type NetworkEntry } from "./NetworkPanel";

function entry(partial: Partial<NetworkEntry> & Pick<NetworkEntry, "id">): NetworkEntry {
  return {
    method: "GET",
    url: "https://example.test/api",
    status: null,
    ms: null,
    ts: 0,
    type: "fetch",
    ...partial,
  };
}

describe("NetworkPanel helpers", () => {
  it("treats pending status as neither ok nor fail", () => {
    const pending = entry({ id: "p1", status: null });
    expect(isFail(pending)).toBe(false);
    expect(isOk(pending)).toBe(false);
  });

  it("marks 2xx as ok", () => {
    const ok = entry({ id: "o1", status: 200, ms: 12, ok: true });
    expect(isOk(ok)).toBe(true);
    expect(isFail(ok)).toBe(false);
  });

  it("marks status 0 and 4xx/5xx as fail", () => {
    expect(isFail(entry({ id: "f0", status: 0, ms: 3 }))).toBe(true);
    expect(isOk(entry({ id: "f0", status: 0, ms: 3 }))).toBe(false);
    expect(isFail(entry({ id: "f4", status: 404, ms: 8 }))).toBe(true);
    expect(isFail(entry({ id: "f5", status: 500, ms: 9 }))).toBe(true);
  });

  it("honors explicit ok:false even for 2xx-looking status", () => {
    const weird = entry({ id: "w1", status: 200, ok: false, ms: 1 });
    expect(isFail(weird)).toBe(true);
    expect(isOk(weird)).toBe(false);
  });

  it("treats 3xx as ok unless ok:false", () => {
    const redirect = entry({ id: "r1", status: 302, ms: 4, ok: true });
    expect(isOk(redirect)).toBe(true);
    expect(isFail(redirect)).toBe(false);
  });
});
