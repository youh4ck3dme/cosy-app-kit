import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Artifact } from "@/components/app-shell/Canvas";
import { exportArtifactDownload } from "./export-artifact";

type AnchorStub = {
  href: string;
  download: string;
  click: ReturnType<typeof vi.fn>;
};

function baseArtifact(over: Partial<Artifact> = {}): Artifact {
  return {
    id: "art-1",
    kind: "html",
    title: "Ops Dashboard",
    content: "<html><body>hi</body></html>",
    ...over,
  };
}

describe("exportArtifactDownload", () => {
  let lastAnchor: AnchorStub | null;
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    lastAnchor = null;
    createObjectURL = vi.fn(() => "blob:mock-url");
    revokeObjectURL = vi.fn();

    vi.stubGlobal("URL", {
      createObjectURL,
      revokeObjectURL,
    });

    vi.stubGlobal("document", {
      createElement: (tag: string) => {
        if (tag !== "a") throw new Error(`unexpected tag ${tag}`);
        const a: AnchorStub = {
          href: "",
          download: "",
          click: vi.fn(),
        };
        lastAnchor = a;
        return a;
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("downloads a single file from content fallback as index.html", async () => {
    await exportArtifactDownload(baseArtifact({ files: null }));

    expect(lastAnchor?.download).toBe("index.html");
    expect(lastAnchor?.href).toBe("blob:mock-url");
    expect(lastAnchor?.click).toHaveBeenCalledOnce();
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("downloads a single explicit file by basename", async () => {
    await exportArtifactDownload(
      baseArtifact({
        files: [{ path: "pages/home.html", language: "html", content: "<html></html>" }],
      }),
    );
    expect(lastAnchor?.download).toBe("home.html");
  });

  it("zips multi-file artifacts with a slug title", async () => {
    const result = await exportArtifactDownload(
      baseArtifact({
        title: "Field Ops SK!",
        files: [
          { path: "index.html", language: "html", content: "<html>a</html>" },
          { path: "about.html", language: "html", content: "<html>b</html>" },
        ],
      }),
    );

    expect(lastAnchor?.download).toBe("field-ops-sk.zip");
    expect(lastAnchor?.click).toHaveBeenCalledOnce();
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(result.mode).toBe("zip");
    expect(result.fileCount).toBe(2);
    expect(result.report.fileCount).toBe(2);
    expect(result.draft).toBe(false);
  });

  it("labels draft ZIP when validation fails", async () => {
    const result = await exportArtifactDownload(
      baseArtifact({
        title: "Broken App",
        files: [
          {
            path: "index.html",
            language: "html",
            content: '<html><script src="app.js"></script><a href="missing.html">x</a></html>',
          },
          { path: "app.js", language: "js", content: "function ( { bad" },
        ],
      }),
    );
    expect(result.draft).toBe(true);
    expect(lastAnchor?.download).toBe("broken-app-DRAFT-validation-failed.zip");
  });

  it("prefers filesOverride over artifact.files", async () => {
    await exportArtifactDownload(
      baseArtifact({
        files: [
          { path: "index.html", language: "html", content: "a" },
          { path: "about.html", language: "html", content: "b" },
        ],
      }),
      [{ path: "only.html", language: "html", content: "solo" }],
    );
    expect(lastAnchor?.download).toBe("only.html");
  });
});
