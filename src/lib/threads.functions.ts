import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { DEFAULT_MODEL, DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from "./models";

export const listThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("threads")
      .select("id,title,model,temperature,updated_at,created_at")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ title: z.string().optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const settings = await context.supabase
      .from("agent_settings")
      .select("default_model, default_temperature, default_system_prompt")
      .eq("user_id", context.userId)
      .maybeSingle();

    const model = settings.data?.default_model ?? DEFAULT_MODEL;
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
  .inputValidator((input: unknown) => z.object({ threadId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: thread, error } = await context.supabase
      .from("threads")
      .select("*")
      .eq("id", data.threadId)
      .single();
    if (error) throw new Error(error.message);
    const [{ data: msgs }, { data: arts }] = await Promise.all([
      context.supabase
        .from("messages")
        .select("*")
        .eq("thread_id", data.threadId)
        .order("created_at"),
      context.supabase
        .from("artifacts")
        .select("*")
        .eq("thread_id", data.threadId)
        .order("created_at", { ascending: false }),
    ]);
    return { thread, messages: msgs ?? [], artifacts: arts ?? [] };
  });

export const renameThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ threadId: z.string().uuid(), title: z.string().min(1).max(200) }).parse(input),
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
  .inputValidator((input: unknown) =>
    z
      .object({
        threadId: z.string().uuid(),
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
  .inputValidator((input: unknown) => z.object({ threadId: z.string().uuid() }).parse(input))
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
    return (
      data ?? {
        user_id: context.userId,
        default_model: DEFAULT_MODEL,
        default_temperature: DEFAULT_TEMPERATURE,
        default_system_prompt: DEFAULT_SYSTEM_PROMPT,
        tools: { create_artifact: true, web_search: false, code_interpreter: false },
      }
    );
  });

export const saveAgentSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
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
      default_model: data.default_model,
      default_temperature: data.default_temperature,
      default_system_prompt: data.default_system_prompt,
      tools: data.tools,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setArtifactPublic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ artifactId: z.string().uuid(), isPublic: z.boolean() }).parse(input),
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
