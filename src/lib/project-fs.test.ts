import { describe, expect, it } from "vitest";
import {
  artifactToFiles,
  findDuplicatePaths,
  mimeForPath,
  needsUrlPreview,
  normalizeProjectPath,
  resolveArtifactFile,
} from "@/lib/project-fs";
import {
  cachePreviewFiles,
  getCachedPreviewFiles,
  signPreviewToken,
  verifyPreviewToken,
} from "@/lib/project-fs.server";
import { validateProject } from "@/lib/agent/project-validate";
import { buildProjectPreviewUrl } from "@/lib/project-preview-url";
import { formatUnverified } from "@/lib/agent/project-validate";

const fleet = [
  {
    path: "index.html",
    content:
      '<!doctype html><html><head><link rel="stylesheet" href="./styles.css"></head><body><a href="vehicles.html">Vehicles</a><script src="./app.js"></script></body></html>',
  },
  {
    path: "vehicles.html",
    content:
      '<!doctype html><html><head><link rel="stylesheet" href="styles.css"></head><body><h1 id="mark">Vehicles</h1><script src="app.js"></script></body></html>',
  },
  {
    path: "styles.css",
    content: "body{background:#0a0;color:#fff}#mark{font-size:24px}",
  },
  {
    path: "app.js",
    content: "document.documentElement.setAttribute('data-app','1');",
  },
];

describe("normalizeProjectPath", () => {
  it("accepts normal relative paths", () => {
    expect(normalizeProjectPath("./styles.css")).toEqual({ ok: true, path: "styles.css" });
    expect(normalizeProjectPath("vehicles.html")).toEqual({ ok: true, path: "vehicles.html" });
  });

  it("rejects traversal and absolute", () => {
    expect(normalizeProjectPath("../secrets")).toMatchObject({ ok: false, reason: "traversal" });
    expect(normalizeProjectPath("/etc/passwd")).toMatchObject({ ok: false, reason: "absolute" });
    expect(normalizeProjectPath("foo/../../x")).toMatchObject({ ok: false, reason: "traversal" });
  });
});

describe("resolveArtifactFile", () => {
  it("serves index.html from multi-file project", () => {
    const r = resolveArtifactFile(fleet, "index.html");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.mime).toContain("text/html");
      expect(r.content).toContain("styles.css");
    }
  });

  it("resolves ./styles.css and ./app.js", () => {
    expect(resolveArtifactFile(fleet, "./styles.css")).toMatchObject({
      ok: true,
      path: "styles.css",
    });
    expect(resolveArtifactFile(fleet, "./app.js")).toMatchObject({ ok: true, path: "app.js" });
  });

  it("vehicles.html package includes shared css/js", () => {
    const css = resolveArtifactFile(fleet, "styles.css");
    const js = resolveArtifactFile(fleet, "app.js");
    expect(css.ok && js.ok).toBe(true);
  });

  it("missing file returns 404", () => {
    expect(resolveArtifactFile(fleet, "missing.js")).toMatchObject({
      ok: false,
      status: 404,
    });
  });

  it("rejects ../ traversal", () => {
    expect(resolveArtifactFile(fleet, "../index.html")).toMatchObject({
      ok: false,
      status: 400,
    });
  });

  it("does not leak another artifact's files", () => {
    const other = [{ path: "secret.js", content: "SECRET" }];
    expect(resolveArtifactFile(fleet, "secret.js").ok).toBe(false);
    expect(resolveArtifactFile(other, "index.html").ok).toBe(false);
  });

  it("mime allowlist rejects unknown extensions", () => {
    expect(mimeForPath("x.exe")).toBeNull();
    expect(
      resolveArtifactFile([{ path: "x.exe", content: "MZ" }], "x.exe"),
    ).toMatchObject({ ok: false, status: 415 });
  });
});

describe("preview tokens + cache (private access)", () => {
  it("signs and verifies tokens", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    const t = signPreviewToken(id);
    expect(verifyPreviewToken(t, id)).toBe(true);
    expect(verifyPreviewToken(t, "22222222-2222-4222-8222-222222222222")).toBe(false);
  });

  it("private artifact cannot be read anonymously without cache", () => {
    // Without public flag / token cache, resolve alone has no auth — auth is route-level.
    // Cache miss simulates anonymous deny when only token path is used.
    const id = "11111111-1111-4111-8111-111111111111";
    const t = signPreviewToken(id);
    expect(getCachedPreviewFiles(t, id)).toBeNull();
  });

  it("public-style access: cached token serves files", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    const t = signPreviewToken(id);
    cachePreviewFiles({ token: t, artifactId: id, files: fleet, isPublic: false });
    const hit = getCachedPreviewFiles(t, id);
    expect(hit?.files.length).toBe(4);
    expect(resolveArtifactFile(hit!.files, "styles.css").ok).toBe(true);
  });
});

describe("needsUrlPreview + URL builder", () => {
  it("detects multi-file packages", () => {
    expect(needsUrlPreview(fleet)).toBe(true);
    expect(needsUrlPreview([{ path: "index.html", content: "<html></html>" }])).toBe(false);
  });

  it("builds tokenized preview URLs", () => {
    const u = buildProjectPreviewUrl({
      artifactId: "11111111-1111-4111-8111-111111111111",
      entryPath: "index.html",
      token: "abc.token",
    });
    expect(u).toContain("/preview/");
    expect(u).toContain("/~/");
    expect(u).toContain("index.html");
  });
});

describe("validateProject", () => {
  it("passes a healthy fleet package", () => {
    const r = validateProject(fleet);
    expect(r.status).toBe("pass");
    expect(r.checks.some((c) => c.id.startsWith("javascript-syntax") && c.status === "pass")).toBe(
      true,
    );
  });

  it("fails invalid app.js syntax", () => {
    const bad = fleet.map((f) =>
      f.path === "app.js" ? { ...f, content: "function ( { broken" } : f,
    );
    const r = validateProject(bad);
    expect(r.status).toBe("fail");
    expect(r.checks.some((c) => c.id.includes("javascript-syntax") && c.status === "fail")).toBe(
      true,
    );
  });

  it("fails broken relative href", () => {
    const bad = [
      {
        path: "index.html",
        content: '<a href="nope.html">x</a><link href="styles.css">',
      },
      { path: "styles.css", content: "body{}" },
    ];
    const r = validateProject(bad);
    expect(r.status).toBe("fail");
    expect(r.checks.some((c) => c.status === "fail" && c.evidence.includes("nope.html"))).toBe(
      true,
    );
  });

  it("returns UNVERIFIED when tools unavailable", () => {
    const r = validateProject(fleet, { toolsAvailable: false });
    expect(r.status).toBe("unverified");
    expect(r.checks[0]?.evidence).toContain("UNVERIFIED");
    expect(formatUnverified("x")).toBe("UNVERIFIED: x");
  });

  it("rejects duplicate paths", () => {
    expect(findDuplicatePaths([...fleet, { path: "app.js", content: "x" }])).toContain("app.js");
  });
});

describe("artifactToFiles", () => {
  it("falls back to content when files empty", () => {
    const files = artifactToFiles({
      kind: "html",
      content: "<html></html>",
      entry_path: "index.html",
      files: [],
    });
    expect(files).toEqual([
      { path: "index.html", content: "<html></html>", language: "html" },
    ]);
  });
});
