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

  it("prefers PUBLISHED_ORIGIN when browser is localhost", () => {
    vi.stubGlobal("window", {
      location: { origin: "http://localhost:8080", hostname: "localhost" },
    });
    // Without VITE_PUBLIC_ORIGIN, PUBLISHED_ORIGIN falls back to local dev origin.
    expect(publicArtifactUrl("id-1")).toBe("http://127.0.0.1:8080/a/id-1");
    expect(publicEmbedUrl("id-1")).toBe("http://127.0.0.1:8080/a/id-1/embed");
  });

  it("uses current origin on production-like hosts", () => {
    expect(publicArtifactUrl("id-2", { origin: "https://example.com" })).toBe(
      "https://example.com/a/id-2",
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
