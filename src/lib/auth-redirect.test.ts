import { describe, expect, it } from "vitest";
import {
  BUILDER_DEV_ORIGIN,
  authHashRecoveryLocation,
  buildEmailRedirectTo,
  supabaseAuthRedirectAllowList,
} from "./auth-redirect";

describe("buildEmailRedirectTo", () => {
  it("targets /auth with next=/chat by default", () => {
    expect(buildEmailRedirectTo("http://localhost:8080")).toBe(
      "http://localhost:8080/auth?next=%2Fchat",
    );
  });

  it("preserves safe next path", () => {
    expect(buildEmailRedirectTo("http://localhost:8080", "/dashboard")).toBe(
      "http://localhost:8080/auth?next=%2Fdashboard",
    );
  });

  it("rejects open redirects in next", () => {
    expect(buildEmailRedirectTo("http://localhost:8080", "//evil.com")).toBe(
      "http://localhost:8080/auth?next=%2Fchat",
    );
  });

  it("strips trailing slash on origin", () => {
    expect(buildEmailRedirectTo("http://localhost:8080/")).toContain("http://localhost:8080/auth?");
  });
});

describe("authHashRecoveryLocation", () => {
  it("returns null when no access_token", () => {
    expect(authHashRecoveryLocation({ pathname: "/", search: "", hash: "" })).toBeNull();
  });

  it("returns null when already on /auth", () => {
    expect(
      authHashRecoveryLocation({
        pathname: "/auth",
        search: "",
        hash: "#access_token=abc&refresh_token=x",
      }),
    ).toBeNull();
  });

  it("hops / with tokens to /auth?next=/chat", () => {
    const dest = authHashRecoveryLocation({
      pathname: "/",
      search: "",
      hash: "#access_token=abc&type=signup",
    });
    expect(dest).toBe("/auth?next=%2Fchat#access_token=abc&type=signup");
  });

  it("preserves non-root path as next", () => {
    const dest = authHashRecoveryLocation({
      pathname: "/chat",
      search: "",
      hash: "access_token=tok",
    });
    expect(dest).toBe("/auth?next=%2Fchat#access_token=tok");
  });
});

describe("supabaseAuthRedirectAllowList", () => {
  it("includes builder 8080 and production origin", () => {
    const list = supabaseAuthRedirectAllowList();
    expect(list).toContain(BUILDER_DEV_ORIGIN);
    expect(list.some((u) => u.includes("8080/**"))).toBe(true);
    expect(list.some((u) => u.includes("cosy-app-kit.lovable.app"))).toBe(true);
  });
});
