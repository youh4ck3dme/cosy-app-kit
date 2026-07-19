import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";

type Client = SupabaseClient<Database>;

export type MemoryRow = {
  id: string;
  key: string;
  value: Json;
  updated_at: string;
};

/** Load recent thread memory and format for the system prompt. */
export async function loadThreadMemory(
  supabase: Client,
  threadId: string,
  limit = 20,
): Promise<MemoryRow[]> {
  const { data, error } = await supabase
    .from("thread_memory")
    .select("id,key,value,updated_at")
    .eq("thread_id", threadId)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[agent/memory] load failed", error);
    return [];
  }
  return data ?? [];
}

export function formatMemoryBlock(rows: MemoryRow[]): string {
  if (!rows.length) return "";
  const lines = rows.map((r) => {
    const summary =
      typeof r.value === "string"
        ? r.value
        : JSON.stringify(r.value);
    return `- ${r.key}: ${summary.slice(0, 400)}`;
  });
  return `## User preferences for this project\n${lines.join("\n")}`;
}

export async function upsertMemory(
  supabase: Client,
  threadId: string,
  key: string,
  value: Json,
): Promise<{ ok: true; previous?: string | null } | { ok: false; error: string }> {
  const trimmed = key.trim().slice(0, 120);
  if (!trimmed) return { ok: false, error: "Memory key is required" };

  const { data: existing } = await supabase
    .from("thread_memory")
    .select("id,value")
    .eq("thread_id", threadId)
    .eq("key", trimmed)
    .maybeSingle();

  const previous =
    existing && existing.value != null
      ? typeof existing.value === "string"
        ? existing.value
        : JSON.stringify(existing.value)
      : null;

  if (existing?.id) {
    const { error } = await supabase
      .from("thread_memory")
      .update({ value, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, previous };
  }

  const { error } = await supabase.from("thread_memory").insert({
    thread_id: threadId,
    key: trimmed,
    value,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, previous: null };
}

export async function deleteMemory(
  supabase: Client,
  threadId: string,
  key: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase
    .from("thread_memory")
    .delete()
    .eq("thread_id", threadId)
    .eq("key", key.trim());
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
