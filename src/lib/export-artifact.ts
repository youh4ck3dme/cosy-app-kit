import type { Artifact, ArtifactFile } from "@/components/app-shell/Canvas";
import {
  analyzeProjectRuntime,
  isMultiPageProject,
  type ProjectRuntimeReport,
} from "@/lib/agent/project-runtime-gate";

function fileList(a: Artifact): ArtifactFile[] {
  if (a.files && a.files.length > 0) return a.files;
  const path = a.kind === "html" ? "index.html" : a.kind === "markdown" ? "README.md" : "artifact.txt";
  return [{ path, language: a.kind, content: a.content }];
}

/** Stable path order for deterministic ZIP contents. */
export function sortArtifactFiles(files: ArtifactFile[]): ArtifactFile[] {
  return [...files].sort((a, b) => {
    // entry-ish first, then alpha
    const rank = (p: string) => {
      if (/^index\.html?$/i.test(p)) return 0;
      if (/\.html?$/i.test(p)) return 1;
      if (/styles?\.css$/i.test(p)) return 2;
      if (/^app\.js$/i.test(p)) return 3;
      if (/readme\.md$/i.test(p)) return 9;
      return 5;
    };
    const d = rank(a.path) - rank(b.path);
    if (d !== 0) return d;
    return a.path.localeCompare(b.path);
  });
}

export function projectExportSlug(title: string): string {
  const slug = title.replace(/\W+/g, "-").toLowerCase().replace(/^-+|-+$/g, "");
  return slug || "artifact";
}

export function analyzeArtifactForExport(
  artifact: Artifact,
  filesOverride?: ArtifactFile[],
): { files: ArtifactFile[]; report: ProjectRuntimeReport } {
  const files = sortArtifactFiles(filesOverride ?? fileList(artifact));
  const report = analyzeProjectRuntime(files.map((f) => ({ path: f.path, content: f.content })));
  return { files, report };
}

export type ExportArtifactResult = {
  mode: "file" | "zip";
  fileCount: number;
  downloadName: string;
  report: ProjectRuntimeReport;
};

/**
 * Download single file or ZIP — shared by Canvas toolbar and Cmd+K palette.
 * Multi-file packages always ZIP with sorted paths (FleetOps-class export).
 * Returns quality report so UI can toast warnings without blocking download.
 */
export async function exportArtifactDownload(
  artifact: Artifact,
  filesOverride?: ArtifactFile[],
): Promise<ExportArtifactResult> {
  const { files, report } = analyzeArtifactForExport(artifact, filesOverride);

  if (files.length === 1 && !isMultiPageProject(files)) {
    const f = files[0]!;
    const blob = new Blob([f.content], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = f.path.split("/").pop() ?? "artifact.txt";
    a.click();
    URL.revokeObjectURL(a.href);
    return {
      mode: "file",
      fileCount: 1,
      downloadName: a.download,
      report,
    };
  }

  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  for (const f of files) {
    // Always write at the path the HTML expects (no nested surprise folders)
    zip.file(f.path.replace(/^\//, ""), f.content);
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${projectExportSlug(artifact.title)}.zip`;
  a.click();
  URL.revokeObjectURL(url);
  return {
    mode: "zip",
    fileCount: files.length,
    downloadName: a.download,
    report,
  };
}
