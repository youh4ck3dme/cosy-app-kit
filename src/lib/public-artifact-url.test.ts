import { afterEach, describe, expect, it, vi } from "vitest";
import {
  publicArtifactPath,
  publicArtifactUrl,
  publicEmbedPath,
  publicEmbedUrl,
} from "./public-artifact-url";

describe("publicArtifactUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds path", () => {
    expect(publicArtifactPath("abc-123")).toBe("/a/abc-123");
    expect(publicEmbedPath("abc-123")).toBe("/a/abc-123/embed");
  });

  it("prefers production origin when browser is localhost", () => {
    vi.stubGlobal("window", {
      location: { origin: "http://localhost:8080", hostname: "localhost" },
    });
    expect(publicArtifactUrl("id-1")).toBe("https://cosy-app-kit.lovable.app/a/id-1");
    expect(publicEmbedUrl("id-1")).toBe("https://cosy-app-kit.lovable.app/a/id-1/embed");
  });

  it("uses current origin on production-like hosts", () => {
    expect(publicArtifactUrl("id-2", { origin: "https://cosy-app-kit.lovable.app" })).toBe(
      "https://cosy-app-kit.lovable.app/a/id-2",
    );
  });

  it("can force local origin when preferProduction is false", () => {
    expect(
      publicArtifactUrl("id-3", {
        preferProduction: false,
        origin: "http://localhost:8080",
      }),
    ).toBe("http://localhost:8080/a/id-3");
  });
});
