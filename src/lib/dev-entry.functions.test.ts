import { describe, expect, it } from "vitest";
import { assertDeveloperEntryAllowed, entryEnabled } from "@/lib/dev-entry.functions";

describe("developer entry gate", () => {
  it("is disabled without DEV_ENTRY_ENABLED", () => {
    expect(entryEnabled({})).toBe(false);
    expect(entryEnabled({ DEV_ENTRY_ENABLED: "0" })).toBe(false);
    expect(entryEnabled({ DEV_ENTRY_ENABLED: "1" })).toBe(true);
  });

  it("rejects when disabled", () => {
    expect(() => assertDeveloperEntryAllowed("x", {})).toThrow(/disabled/i);
  });

  it("rejects wrong token", () => {
    expect(() =>
      assertDeveloperEntryAllowed("wrong", {
        DEV_ENTRY_ENABLED: "1",
        DEV_ENTRY_TOKEN: "secret",
        DEV_ENTRY_EMAIL: "dev@example.com",
        DEV_ENTRY_PASSWORD: "pw",
      }),
    ).toThrow(/Forbidden/i);
  });

  it("rejects when password missing", () => {
    expect(() =>
      assertDeveloperEntryAllowed("secret", {
        DEV_ENTRY_ENABLED: "1",
        DEV_ENTRY_TOKEN: "secret",
        DEV_ENTRY_EMAIL: "dev@example.com",
      }),
    ).toThrow(/DEV_ENTRY_PASSWORD/i);
  });

  it("passes when fully configured", () => {
    expect(() =>
      assertDeveloperEntryAllowed("secret", {
        DEV_ENTRY_ENABLED: "1",
        DEV_ENTRY_TOKEN: "secret",
        DEV_ENTRY_EMAIL: "dev@example.com",
        DEV_ENTRY_PASSWORD: "pw",
      }),
    ).not.toThrow();
  });
});
