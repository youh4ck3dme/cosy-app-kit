import { describe, expect, it, vi } from "vitest";
import {
  formatGoogleSignInError,
  isGoogleProviderDisabledError,
  logGoogleProviderSetupHint,
  PROD_AUTH_REDIRECT,
} from "@/lib/auth-google";

describe("formatGoogleSignInError", () => {
  it("returns short English when Google provider is disabled", () => {
    const msg = formatGoogleSignInError("Unsupported provider: provider is not enabled");
    expect(msg).toBe("Google sign-in is not enabled for this app.");
    expect(msg).not.toMatch(/Client ID|oauth\.lovable/i);
  });

  it("passes through other errors", () => {
    expect(formatGoogleSignInError("redirect_uri mismatch")).toBe("redirect_uri mismatch");
  });
});

describe("isGoogleProviderDisabledError", () => {
  it("detects disabled provider messages", () => {
    expect(isGoogleProviderDisabledError("provider is not enabled")).toBe(true);
    expect(isGoogleProviderDisabledError("redirect_uri mismatch")).toBe(false);
  });
});

describe("logGoogleProviderSetupHint", () => {
  it("logs Supabase setup details to console", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logGoogleProviderSetupHint();
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/Supabase|uotvcsjoriamsagfprbq/i));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining(PROD_AUTH_REDIRECT));
    spy.mockRestore();
  });
});
