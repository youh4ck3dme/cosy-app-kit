import { describe, expect, it } from "vitest";
import {
  joinArtifactPath,
  matchArtifactFile,
  resolvePreviewNavTarget,
} from "@/lib/preview-nav";

const FILES = ["index.html", "about.html", "contact.html", "pricing.html", "css/site.css"];

describe("joinArtifactPath", () => {
  it("resolves sibling from root entry", () => {
    expect(joinArtifactPath("index.html", "about.html")).toBe("about.html");
  });

  it("resolves from nested current path", () => {
    expect(joinArtifactPath("pages/home.html", "about.html")).toBe("pages/about.html");
  });

  it("strips leading slash as artifact root", () => {
    expect(joinArtifactPath("index.html", "/contact.html")).toBe("contact.html");
  });

  it("rejects traversal past root", () => {
    expect(joinArtifactPath("index.html", "../secret.html")).toBeNull();
  });

  it("normalizes dot segments", () => {
    expect(joinArtifactPath("index.html", "./about.html")).toBe("about.html");
  });
});

describe("matchArtifactFile", () => {
  it("matches exact path", () => {
    expect(matchArtifactFile("about.html", FILES)).toBe("about.html");
  });

  it("adds .html when missing", () => {
    expect(matchArtifactFile("about", FILES)).toBe("about.html");
  });

  it("matches basename when unique", () => {
    expect(matchArtifactFile("pages/about.html", FILES)).toBe("about.html");
  });
});

describe("resolvePreviewNavTarget", () => {
  const opts = { filePaths: FILES, currentPath: "index.html" };

  it("routes relative html to internal file", () => {
    expect(resolvePreviewNavTarget("about.html", opts)).toEqual({
      kind: "internal",
      path: "about.html",
    });
  });

  it("keeps hash on internal nav", () => {
    expect(resolvePreviewNavTarget("contact.html#form", opts)).toEqual({
      kind: "internal",
      path: "contact.html",
      hash: "form",
    });
  });

  it("allows same-page hash", () => {
    expect(resolvePreviewNavTarget("#pricing", opts)).toEqual({
      kind: "hash",
      hash: "pricing",
    });
  });

  it("passes through mailto/tel", () => {
    expect(resolvePreviewNavTarget("mailto:a@b.c", opts)).toEqual({
      kind: "protocol",
      url: "mailto:a@b.c",
    });
  });

  it("marks http as external", () => {
    expect(resolvePreviewNavTarget("https://example.com", opts)).toEqual({
      kind: "external",
      url: "https://example.com",
    });
  });

  it("ignores unknown pages (no blank navigation)", () => {
    expect(resolvePreviewNavTarget("missing.html", opts)).toEqual({ kind: "ignore" });
  });

  it("ignores javascript urls", () => {
    expect(resolvePreviewNavTarget("javascript:alert(1)", opts)).toEqual({ kind: "ignore" });
  });
});
