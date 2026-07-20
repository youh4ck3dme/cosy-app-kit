import type { Artifact, ArtifactFile } from "@/components/app-shell/Canvas";

function fileList(a: Artifact): ArtifactFile[] {
  if (a.files && a.files.length > 0) return a.files;
  const path = a.kind === "html" ? "index.html" : a.kind === "markdown" ? "README.md" : "artifact.txt";
  return [{ path, language: a.kind, content: a.content }];
}

/** Download single file or ZIP — shared by Canvas toolbar and Cmd+K palette. */
export async function exportArtifactDownload(
  artifact: Artifact,
  filesOverride?: ArtifactFile[],
): Promise<void> {
  const files = filesOverride ?? fileList(artifact);
  if (files.length === 1) {
    const f = files[0]!;
    const blob = new Blob([f.content], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = f.path.split("/").pop() ?? "artifact.txt";
    a.click();
    URL.revokeObjectURL(a.href);
    return;
  }
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  for (const f of files) zip.file(f.path, f.content);
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${artifact.title.replace(/\W+/g, "-").toLowerCase() || "artifact"}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
