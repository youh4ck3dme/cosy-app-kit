/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from "vitest";
import {
  extractOAuthTokensFromHash,
  extractOAuthTokensFromLocation,
  isLocalDevReturnUrl,
  isLocalHost,
} from "@/lib/auth-oauth";

describe("isLocalDevReturnUrl", () => {
  it("accepts loopback origins only", () => {
    expect(isLocalDevReturnUrl("http://127.0.0.1:8080/auth")).toBe(true);
    expect(isLocalDevReturnUrl("http://localhost:8080/auth")).toBe(true);
    expect(isLocalDevReturnUrl("http://192.168.0.4:8080/auth")).toBe(false);
    expect(isLocalDevReturnUrl("https://cosy-app-kit.vercel.app/auth")).toBe(false);
    expect(isLocalDevReturnUrl("http://evil.example/auth")).toBe(false);
  });
});

describe("extractOAuthTokensFromHash", () => {
  it("reads tokens from hash only", () => {
    const prev = window.location.href;
    window.history.replaceState({}, "", "/auth#access_token=at&refresh_token=rt&state=s");
    expect(extractOAuthTokensFromHash()).toEqual({
      access_token: "at",
      refresh_token: "rt",
      state: "s",
    });
    window.history.replaceState({}, "", prev);
  });

  it("ignores tokens in query string", () => {
    const prev = window.location.href;
    window.history.replaceState({}, "", "/auth?access_token=at&refresh_token=rt");
    expect(extractOAuthTokensFromHash()).toBeNull();
    expect(extractOAuthTokensFromLocation()).toBeNull();
    window.history.replaceState({}, "", prev);
  });
});

describe("isLocalHost", () => {
  it("detects loopback hostname in happy-dom", () => {
    expect(isLocalHost()).toBe(true);
  });
});
