import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  DEFAULT_MODEL,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_TEMPERATURE,
  resolveKnownModelId,
} from "./models";

/**
 * TanStack Start / seroval must deserialize a plain JSON object.
 * Supabase rows can carry non-plain prototypes / odd JSON that breaks:
 * "Cannot coerce the result to a single JSON object".
 */
function toPlainJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export const listThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("threads")
      .select("id,title,model,temperature,updated_at,created_at")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return toPlainJson(data ?? []);
  });

export const createThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ title: z.string().optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const settings = await context.supabase
      .from("agent_settings")
      .select("default_model, default_temperature, default_system_prompt")
      .eq("user_id", context.userId)
      .maybeSingle();

    const model = resolveKnownModelId(settings.data?.default_model ?? DEFAULT_MODEL);
    const temperature = settings.data?.default_temperature ?? DEFAULT_TEMPERATURE;
    const system_prompt = settings.data?.default_system_prompt ?? DEFAULT_SYSTEM_PROMPT;

    const { data: row, error } = await context.supabase
      .from("threads")
      .insert({
        user_id: context.userId,
        title: data.title ?? "New chat",
        model,
        temperature,
        system_prompt,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const getThread = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ threadId: z.uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: thread, error } = await context.supabase
      .from("threads")
      .select("id,user_id,title,model,temperature,system_prompt,created_at,updated_at")
      .eq("id", data.threadId)
      .single();
    if (error) throw new Error(error.message);
    const [{ data: msgs }, { data: arts }] = await Promise.all([
      context.supabase
        .from("messages")
        .select("id,thread_id,role,parts,created_at")
        .eq("thread_id", data.threadId)
        .order("created_at"),
      context.supabase
        .from("artifacts")
        .select("id,thread_id,kind,title,content,files,entry_path,is_public,created_at,message_id")
        .eq("thread_id", data.threadId)
        .order("created_at", { ascending: false }),
    ]);
    // Plain JSON object only — required for serverFnFetcher / seroval deserialize.
    return toPlainJson({
      thread,
      messages: msgs ?? [],
      artifacts: arts ?? [],
    });
  });

export const renameThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ threadId: z.uuid(), title: z.string().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("threads")
      .update({ title: data.title })
      .eq("id", data.threadId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateThreadModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        threadId: z.uuid(),
        model: z.string().optional(),
        temperature: z.number().min(0).max(2).optional(),
        system_prompt: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const patch: { model?: string; temperature?: number; system_prompt?: string } = {};
    if (data.model) patch.model = data.model;
    if (typeof data.temperature === "number") patch.temperature = data.temperature;
    if (typeof data.system_prompt === "string") patch.system_prompt = data.system_prompt;
    const { error } = await context.supabase.from("threads").update(patch).eq("id", data.threadId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ threadId: z.uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("threads").delete().eq("id", data.threadId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getAgentSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("agent_settings")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!data) {
      return {
        user_id: context.userId,
        default_model: DEFAULT_MODEL,
        default_temperature: DEFAULT_TEMPERATURE,
        default_system_prompt: DEFAULT_SYSTEM_PROMPT,
        tools: {
          create_artifact: true,
          edit_file: true,
          read_artifact: true,
          remember: true,
          plan_steps: true,
          web_search: false,
          fetch_url: false,
          code_interpreter: false,
        },
      };
    }
    // Strip legacy OpenAI/Gemini defaults stored before Mistral-only switch.
    return {
      ...data,
      default_model: resolveKnownModelId(data.default_model),
    };
  });

export const saveAgentSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        default_model: z.string(),
        default_temperature: z.number().min(0).max(2),
        default_system_prompt: z.string(),
        tools: z.record(z.string(), z.boolean()),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("agent_settings").upsert({
      user_id: context.userId,
      default_model: resolveKnownModelId(data.default_model),
      default_temperature: data.default_temperature,
      default_system_prompt: data.default_system_prompt,
      tools: data.tools,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setArtifactPublic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ artifactId: z.uuid(), isPublic: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    // RLS: user can only update artifacts belonging to their own thread.
    const { error } = await context.supabase
      .from("artifacts")
      .update({ is_public: data.isPublic })
      .eq("id", data.artifactId);
    if (error) throw new Error(error.message);
    return { ok: true, isPublic: data.isPublic };
  });

export const listThreadMemory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ threadId: z.uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("thread_memory")
      .select("id,key,value,updated_at")
      .eq("thread_id", data.threadId)
      .order("updated_at", { ascending: false })
      .limit(40);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertThreadMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        threadId: z.uuid(),
        key: z.string().min(1).max(120),
        value: z.string().min(1).max(2000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // Ensure thread ownership via RLS on threads join (memory RLS should scope thread).
    const { data: thread } = await context.supabase
      .from("threads")
      .select("id")
      .eq("id", data.threadId)
      .single();
    if (!thread) throw new Error("Thread not found");

    const { data: existing } = await context.supabase
      .from("thread_memory")
      .select("id")
      .eq("thread_id", data.threadId)
      .eq("key", data.key.trim())
      .maybeSingle();

    if (existing?.id) {
      const { error } = await context.supabase
        .from("thread_memory")
        .update({ value: data.value, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("thread_memory").insert({
        thread_id: data.threadId,
        key: data.key.trim(),
        value: data.value,
      });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteThreadMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ threadId: z.uuid(), key: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("thread_memory")
      .delete()
      .eq("thread_id", data.threadId)
      .eq("key", data.key.trim());
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * G0 / G-P0-1: hard-delete messages from an anchor (edit/retry) so reload
 * matches client history. Artifacts are left intact (may orphan — OK for v1).
 *
 * Prefer `messageId` when it exists in DB. Else use `keepCount` (first N rows
 * to keep by created_at order) for streaming temp client ids.
 */
export const truncateThreadMessagesAfter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        threadId: z.uuid(),
        messageId: z.string().min(1).optional(),
        mode: z.enum(["edit_user", "retry_assistant"]).default("edit_user"),
        /** Fallback when messageId is not a DB row (e.g. useChat temp id). */
        keepCount: z.number().int().min(0).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error: listErr } = await context.supabase
      .from("messages")
      .select("id,created_at")
      .eq("thread_id", data.threadId)
      .order("created_at", { ascending: true });
    if (listErr) throw new Error(listErr.message);
    const ordered = rows ?? [];

    const { selectMessageIdsToDelete, selectMessageIdsToDeleteFromKeepCount, isUuid } =
      await import("@/lib/agent/truncate");

    let toDelete: string[] = [];
    if (data.messageId && isUuid(data.messageId)) {
      toDelete = selectMessageIdsToDelete(ordered, data.messageId, data.mode);
      // If uuid not found in this thread, fall through to keepCount if provided
      if (!toDelete.length && typeof data.keepCount === "number") {
        toDelete = selectMessageIdsToDeleteFromKeepCount(ordered, data.keepCount);
      } else if (!toDelete.length) {
        // messageId claimed as uuid but missing — no-op rather than wipe
        return { ok: true as const, deleted: 0, reason: "anchor_not_found" as const };
      }
    } else if (typeof data.keepCount === "number") {
      toDelete = selectMessageIdsToDeleteFromKeepCount(ordered, data.keepCount);
    } else if (data.messageId) {
      // Non-uuid id: try match anyway (in case DB ever stores client ids)
      toDelete = selectMessageIdsToDelete(ordered, data.messageId, data.mode);
      if (!toDelete.length && typeof data.keepCount !== "number") {
        return { ok: true as const, deleted: 0, reason: "anchor_not_found" as const };
      }
    } else {
      throw new Error("messageId or keepCount is required");
    }

    if (!toDelete.length) return { ok: true as const, deleted: 0 };

    const { error: delErr } = await context.supabase
      .from("messages")
      .delete()
      .eq("thread_id", data.threadId)
      .in("id", toDelete);
    if (delErr) throw new Error(delErr.message);

    await context.supabase
      .from("threads")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", data.threadId);

    return { ok: true as const, deleted: toDelete.length };
  });

export const updateArtifactFiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        artifactId: z.uuid(),
        files: z.array(
          z.object({
            path: z.string(),
            language: z.string(),
            content: z.string(),
          }),
        ),
        entry_path: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const entry = data.entry_path ?? data.files[0]?.path;
    const main = data.files.find((f) => f.path === entry) ?? data.files[0];
    if (!main) throw new Error("No files");
    const { data: art, error } = await context.supabase
      .from("artifacts")
      .update({
        files: data.files as unknown as import("@/integrations/supabase/types").Json,
        content: main.content,
        entry_path: entry ?? null,
      })
      .eq("id", data.artifactId)
      .select("id,title")
      .single();
    if (error) throw new Error(error.message);

    const { snapshotArtifactVersion } = await import("@/lib/agent/versions");
    await snapshotArtifactVersion(context.supabase, {
      artifactId: data.artifactId,
      files: data.files,
      content: main.content,
      entry_path: entry ?? null,
      title: art?.title,
      source: "user_save",
    });
    return { ok: true };
  });

/** G2 — Cursor phase H: list versions for timeline UI */
export const listArtifactVersions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        artifactId: z.uuid(),
        limit: z.number().int().min(1).max(100).optional().default(40),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // Ownership via RLS on artifact_versions + join check
    const { data: art, error: aErr } = await context.supabase
      .from("artifacts")
      .select("id")
      .eq("id", data.artifactId)
      .single();
    if (aErr || !art) throw new Error(aErr?.message ?? "Artifact not found");

    const { data: rows, error } = await context.supabase
      .from("artifact_versions")
      .select("id,artifact_id,source,title,entry_path,created_at,content,files")
      .eq("artifact_id", data.artifactId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);

    const { estimateVersionBytes } = await import("@/lib/agent/versions");
    return (rows ?? []).map((r) => ({
      id: r.id,
      artifact_id: r.artifact_id,
      source: r.source,
      title: r.title,
      entry_path: r.entry_path,
      created_at: r.created_at,
      bytes: estimateVersionBytes(r.files, r.content),
    }));
  });

/** G2 — restore a snapshot onto the live artifact (also writes a restore version). */
export const restoreArtifactVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ versionId: z.uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: ver, error: vErr } = await context.supabase
      .from("artifact_versions")
      .select("id,artifact_id,files,content,entry_path,title")
      .eq("id", data.versionId)
      .single();
    if (vErr || !ver) throw new Error(vErr?.message ?? "Version not found");

    const { error: upErr } = await context.supabase
      .from("artifacts")
      .update({
        files: ver.files,
        content: ver.content,
        entry_path: ver.entry_path,
        title: ver.title ?? undefined,
      })
      .eq("id", ver.artifact_id);
    if (upErr) throw new Error(upErr.message);

    const { snapshotArtifactVersion } = await import("@/lib/agent/versions");
    await snapshotArtifactVersion(context.supabase, {
      artifactId: ver.artifact_id,
      files: ver.files,
      content: ver.content,
      entry_path: ver.entry_path,
      title: ver.title,
      source: "restore",
    });

    return { ok: true as const, artifactId: ver.artifact_id, versionId: ver.id };
  });

/**
 * Optional follow-up chips (Cursor phase E can call this; static fallback if fails).
 * Uses Mistral Small only — never OpenAI/Gemini.
 */
export const suggestFollowups = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        lastAssistantText: z.string().max(8000).optional().default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const {
      buildSuggestSystemPrompt,
      buildSuggestUserPrompt,
      parseSuggestionLines,
      staticSuggestionFallback,
    } = await import("@/lib/agent/suggestions");
    const { SUGGESTION_MODEL } = await import("@/lib/models");
    const { createMistralProvider } = await import("@/lib/ai-gateway.server");

    const key = (process.env.MISTRAL_API_KEY ?? process.env.MISTRAL_KEY ?? "").trim();
    if (!key) {
      return {
        ok: true as const,
        source: "static" as const,
        suggestions: staticSuggestionFallback(),
      };
    }

    try {
      const { generateText } = await import("ai");
      const provider = createMistralProvider(key);
      const result = await generateText({
        model: provider(SUGGESTION_MODEL),
        system: buildSuggestSystemPrompt(),
        prompt: buildSuggestUserPrompt(data.lastAssistantText ?? ""),
        temperature: 0.7,
        maxOutputTokens: 200,
      });
      const parsed = parseSuggestionLines(result.text ?? "");
      if (parsed.length) {
        return { ok: true as const, source: "mistral" as const, suggestions: parsed };
      }
    } catch (e) {
      console.warn("[suggestFollowups] failed, using static", e);
    }

    return {
      ok: true as const,
      source: "static" as const,
      suggestions: staticSuggestionFallback(),
    };
  });
