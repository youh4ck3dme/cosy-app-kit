import { describe, expect, it } from "vitest";
import {
  AccessCodeError,
  assertAccessCode,
  resolveGuestCredentials,
} from "@/lib/access-code.functions";

describe("access code gate", () => {
  it("rejects when COSY_ACCESS_CODE unset", () => {
    expect(() => assertAccessCode("1234", {})).toThrow(AccessCodeError);
    expect(() => assertAccessCode("1234", {})).toThrow(/nie je nastavený/i);
  });

  it("rejects wrong code", () => {
    expect(() => assertAccessCode("wrong", { COSY_ACCESS_CODE: "secret" })).toThrow(
      AccessCodeError,
    );
    try {
      assertAccessCode("wrong", { COSY_ACCESS_CODE: "secret" });
    } catch (e) {
      expect((e as AccessCodeError).code).toBe("INVALID");
    }
  });

  it("accepts matching code", () => {
    expect(() => assertAccessCode("secret", { COSY_ACCESS_CODE: "secret" })).not.toThrow();
  });

  it("requires guest credentials after code match", () => {
    expect(() => resolveGuestCredentials({ COSY_ACCESS_CODE: "pin" })).toThrow(
      /Hosťovské/i,
    );
    const creds = resolveGuestCredentials({
      COSY_ACCESS_CODE: "pin",
      COSY_GUEST_EMAIL: "guest@example.com",
    });
    expect(creds.email).toBe("guest@example.com");
    expect(creds.password).toBe("pin");
  });
});
