import { describe, expect, it } from "vitest";
import { decodeOAuthState, encodeOAuthState, isLocalDevReturnUrl } from "@/integrations/lovable";

describe("Google OAuth helpers", () => {
  it("accepts loopback and private LAN return URLs", () => {
    expect(isLocalDevReturnUrl("http://127.0.0.1:8080/auth")).toBe(true);
    expect(isLocalDevReturnUrl("http://localhost:8080/auth")).toBe(true);
    expect(isLocalDevReturnUrl("http://192.168.0.4:8080/auth")).toBe(true);
    expect(isLocalDevReturnUrl("https://cosy-app-kit.lovable.app/auth")).toBe(false);
    expect(isLocalDevReturnUrl("http://evil.example/auth")).toBe(false);
  });

  it("round-trips oauth state with lr + next", () => {
    const raw = encodeOAuthState({
      v: 1,
      n: "abc123",
      lr: "http://127.0.0.1:8080/auth",
      next: "/chat",
    });
    const decoded = decodeOAuthState(raw);
    expect(decoded).toMatchObject({
      v: 1,
      n: "abc123",
      lr: "http://127.0.0.1:8080/auth",
      next: "/chat",
    });
  });

  it("rejects malformed state", () => {
    expect(decodeOAuthState("not-base64")).toBeNull();
    expect(decodeOAuthState(btoa(JSON.stringify({ v: 2, n: "x" })))).toBeNull();
  });
});
