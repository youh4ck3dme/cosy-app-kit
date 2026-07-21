import type { Artifact, ArtifactFile } from "@/components/app-shell/Canvas";
import {
  analyzeProjectRuntime,
  isMultiPageProject,
  type ProjectRuntimeReport,
} from "@/lib/agent/project-runtime-gate";
import { validateProject } from "@/lib/agent/project-validate";

function fileList(a: Artifact): ArtifactFile[] {
  if (a.files && a.files.length > 0) return a.files;
  const path = a.kind === "html" ? "index.html" : a.kind === "markdown" ? "README.md" : "artifact.txt";
  return [{ path, language: a.kind, content: a.content }];
}

/** Stable path order for deterministic ZIP contents. */
export function sortArtifactFiles(files: ArtifactFile[]): ArtifactFile[] {
  return [...files].sort((a, b) => {
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
  validationStatus: "pass" | "fail" | "unverified";
  draft: boolean;
};

/**
 * Download single file or ZIP — shared by Canvas toolbar and Cmd+K palette.
 * Failed validation still downloads but is labeled as a draft export.
 */
export async function exportArtifactDownload(
  artifact: Artifact,
  filesOverride?: ArtifactFile[],
): Promise<ExportArtifactResult> {
  const { files, report } = analyzeArtifactForExport(artifact, filesOverride);
  const validation = validateProject(
    files.map((f) => ({ path: f.path, content: f.content })),
    { entryPath: artifact.entry_path },
  );
  const draft = validation.status !== "pass" || !report.ok;

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
      validationStatus: validation.status,
      draft,
    };
  }

  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  for (const f of files) {
    zip.file(f.path.replace(/^\//, ""), f.content);
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const base = projectExportSlug(artifact.title);
  a.download = draft ? `${base}-DRAFT-validation-failed.zip` : `${base}.zip`;
  a.click();
  URL.revokeObjectURL(url);
  return {
    mode: "zip",
    fileCount: files.length,
    downloadName: a.download,
    report,
    validationStatus: validation.status,
    draft,
  };
}
