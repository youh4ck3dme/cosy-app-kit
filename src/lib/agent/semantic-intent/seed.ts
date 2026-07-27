import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import { snapshotArtifactVersion } from "@/lib/agent/versions";
import { detectSemanticIntent, shouldSeedSkeleton } from "./detect";
import { renderProductSkeleton } from "./skeletons";
import type { SemanticIntent, SkeletonSeedResult } from "./types";

type Client = SupabaseClient<Database>;

export type SeedSkeletonArgs = {
  supabase: Client;
  threadId: string;
  userPrompt: string;
  /** When false, skip (create_artifact disabled). Default true. */
  enabled?: boolean;
};

/**
 * System appendix so Codestral fills the seeded artifact instead of blank-page generation.
 */
export function formatSkeletonSystemAppendix(seed: SkeletonSeedResult): string {
  return `

## Instant product skeleton (already on canvas)
Intent: **${seed.intent}** (confidence ${(seed.confidence * 100).toFixed(0)}%).
Brand: **${seed.brand}**.
Artifact id: \`${seed.artifactId}\` (title «${seed.title}»).

HARD RULES for this turn:
1. A premium single-file HTML skeleton is ALREADY on the live canvas — do NOT call create_artifact for a second app unless the user explicitly asked for a separate artifact.
2. Prefer **edit_file** (and read_artifact first) on artifact \`${seed.artifactId}\` path \`index.html\`.
3. Preserve structure: keep \`data-nf-slot\` hooks, empty-state regions, mobile-first layout, toast host, and localStorage scaffold unless replacing with equivalent working UI.
4. Fill domain logic inside BUILD_HOOK markers (slot engine, validation, charts, CRUD, etc.).
5. No external CDN. No alert(). Use the existing toast host.
6. After edits, the app should feel complete for a demo — not leave TODO placeholders if you can implement them.`;
}

/**
 * Detect intent and insert a single-file skeleton artifact when the thread is empty.
 * Fail-open: returns null on any skip/error (never blocks Build stream).
 */
export async function seedInstantProductSkeleton(
  args: SeedSkeletonArgs,
): Promise<SkeletonSeedResult | null> {
  if (args.enabled === false) return null;
  const prompt = (args.userPrompt ?? "").trim();
  if (!prompt) return null;

  const detected = detectSemanticIntent(prompt);
  if (!shouldSeedSkeleton(detected)) return null;

  try {
    const { count, error: countErr } = await args.supabase
      .from("artifacts")
      .select("id", { count: "exact", head: true })
      .eq("thread_id", args.threadId);
    if (countErr) {
      console.warn("[semantic-intent] artifact count failed", countErr.message);
      return null;
    }
    if ((count ?? 0) > 0) return null;

    const intent = detected.intent as SemanticIntent;
    const html = renderProductSkeleton({ brand: detected.brand, intent });
    const title = detected.title.slice(0, 120);
    const files = [
      {
        path: "index.html",
        language: "html",
        content: html,
      },
    ];

    const { data, error } = await args.supabase
      .from("artifacts")
      .insert({
        thread_id: args.threadId,
        kind: "html",
        title,
        content: html,
        files: files as unknown as Json,
        entry_path: "index.html",
      })
      .select("id,title")
      .single();

    if (error || !data) {
      console.warn("[semantic-intent] skeleton insert failed", error?.message);
      return null;
    }

    await snapshotArtifactVersion(args.supabase, {
      artifactId: data.id,
      files,
      content: html,
      entry_path: "index.html",
      title: data.title,
      source: "tool",
    });

    await args.supabase
      .from("threads")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", args.threadId);

    return {
      artifactId: data.id,
      title: data.title,
      kind: "html",
      intent,
      confidence: detected.confidence,
      brand: detected.brand,
    };
  } catch (err) {
    console.warn("[semantic-intent] seed failed", err);
    return null;
  }
}
