/**
 * Artifact version snapshots (G2).
 * Write path used by tools, fence fallback, and user_save.
 * Cursor UI: listArtifactVersions / restoreArtifactVersion server fns.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import type { ArtifactFile } from "@/lib/agent/artifacts";

type Client = SupabaseClient<Database>;

export type VersionSource = "tool" | "fence" | "user_save" | "restore";

export type SnapshotInput = {
  artifactId: string;
  files: ArtifactFile[] | Json;
  content: string;
  entry_path?: string | null;
  title?: string | null;
  message_id?: string | null;
  source: VersionSource;
};

/** Insert a version row. Failures are logged, never throw (must not break chat). */
export async function snapshotArtifactVersion(
  supabase: Client,
  input: SnapshotInput,
): Promise<{ ok: true; versionId: string } | { ok: false; error: string }> {
  const filesJson = (
    Array.isArray(input.files) ? input.files : input.files
  ) as unknown as Json;

  const { data, error } = await supabase
    .from("artifact_versions")
    .insert({
      artifact_id: input.artifactId,
      files: filesJson,
      content: input.content ?? "",
      entry_path: input.entry_path ?? null,
      title: input.title ?? null,
      message_id: input.message_id ?? null,
      source: input.source,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[agent/versions] snapshot failed", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true, versionId: data.id };
}

export type VersionListItem = {
  id: string;
  artifact_id: string;
  source: string;
  title: string | null;
  entry_path: string | null;
  created_at: string;
  /** Approximate payload size for UI badge */
  bytes: number;
};

export function estimateVersionBytes(files: Json, content: string): number {
  try {
    const filesLen = JSON.stringify(files ?? []).length;
    return filesLen + (content?.length ?? 0);
  } catch {
    return content?.length ?? 0;
  }
}
