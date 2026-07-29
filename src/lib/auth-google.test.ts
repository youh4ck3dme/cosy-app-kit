import { describe, expect, it } from "vitest";
import { formatGoogleSignInError } from "@/lib/auth-google";

describe("formatGoogleSignInError", () => {
  it("explains disabled Google provider", () => {
    const msg = formatGoogleSignInError("Unsupported provider: provider is not enabled");
    expect(msg).toMatch(/nie je zapnut|not enabled/i);
    expect(msg).toMatch(/Client ID/i);
    expect(msg).toMatch(/oauth\.lovable\.app|Nastavenia Googlu/i);
  });

  it("passes through other errors", () => {
    expect(formatGoogleSignInError("redirect_uri mismatch")).toBe("redirect_uri mismatch");
  });
});
