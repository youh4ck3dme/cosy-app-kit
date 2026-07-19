import { tool, type ToolSet } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import { inferTitle, type ArtifactFile } from "@/lib/agent/artifacts";
import { upsertMemory } from "@/lib/agent/memory";
import {
  applyRewrite,
  applySearchReplace,
  MAX_FILE_BYTES,
  sanitizeRelativePath,
} from "@/lib/agent/patch";
import { fetchUrlText, webSearch } from "@/lib/agent/web";

type Client = SupabaseClient<Database>;

export type ToolFlags = {
  create_artifact?: boolean;
  edit_file?: boolean;
  read_artifact?: boolean;
  remember?: boolean;
  plan_steps?: boolean;
  web_search?: boolean;
  fetch_url?: boolean;
};

export type BuildToolsArgs = {
  mode: "build" | "plan";
  threadId: string;
  supabase: Client;
  flags?: ToolFlags;
};

function asFiles(files: ArtifactFile[]): Json {
  return files as unknown as Json;
}

function parseFilesJson(raw: Json | null | undefined): ArtifactFile[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((f) => {
      if (!f || typeof f !== "object") return null;
      const o = f as Record<string, unknown>;
      if (typeof o.path !== "string" || typeof o.content !== "string") return null;
      return {
        path: o.path,
        language: typeof o.language === "string" ? o.language : "text",
        content: o.content,
      };
    })
    .filter(Boolean) as ArtifactFile[];
}

function sanitizeFiles(
  files: Array<{ path: string; language: string; content: string }>,
):
  | { ok: true; files: ArtifactFile[] }
  | { ok: false; error: string } {
  const out: ArtifactFile[] = [];
  for (const f of files) {
    const path = sanitizeRelativePath(f.path);
    if (!path.ok) return { ok: false, error: `Invalid path «${f.path}»: ${path.error}` };
    if (f.content.length > MAX_FILE_BYTES) {
      return {
        ok: false,
        error: `File «${path.path}» exceeds ${MAX_FILE_BYTES} bytes`,
      };
    }
    if (!f.content.length) {
      return { ok: false, error: `File «${path.path}» is empty` };
    }
    out.push({
      path: path.path,
      language: f.language.slice(0, 40) || "text",
      content: f.content,
    });
  }
  return { ok: true, files: out };
}

export function buildTools({ mode, threadId, supabase, flags }: BuildToolsArgs): ToolSet {
  const f = {
    create_artifact: flags?.create_artifact !== false,
    edit_file: flags?.edit_file !== false,
    read_artifact: flags?.read_artifact !== false,
    remember: flags?.remember !== false,
    plan_steps: flags?.plan_steps !== false,
    web_search: flags?.web_search === true,
    fetch_url: flags?.fetch_url === true,
  };

  const read_artifact = tool({
    description:
      "Read an artifact in this thread so you can edit accurately. Use paths_only for a file tree without full content.",
    inputSchema: z.object({
      artifact_id: z.string().uuid().optional(),
      paths_only: z.boolean().optional().default(false),
    }),
    execute: async ({ artifact_id, paths_only }) => {
      if (!f.read_artifact) {
        return { ok: false as const, error: "read_artifact is disabled" };
      }
      const select = "id,title,kind,entry_path,content,files,created_at";
      let data: {
        id: string;
        title: string;
        kind: string;
        entry_path: string | null;
        content: string;
        files: Json;
      } | null = null;

      if (artifact_id) {
        const res = await supabase
          .from("artifacts")
          .select(select)
          .eq("thread_id", threadId)
          .eq("id", artifact_id)
          .single();
        if (res.error || !res.data) {
          return { ok: false as const, error: res.error?.message ?? "Not found" };
        }
        data = res.data;
      } else {
        const res = await supabase
          .from("artifacts")
          .select(select)
          .eq("thread_id", threadId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (res.error) return { ok: false as const, error: res.error.message };
        if (!res.data) return { ok: false as const, error: "No artifacts in this thread yet" };
        data = res.data;
      }

      const files = parseFilesJson(data.files);
      if (paths_only) {
        return {
          ok: true as const,
          artifact: {
            id: data.id,
            title: data.title,
            kind: data.kind,
            entry_path: data.entry_path,
            files: files.map((file) => ({
              path: file.path,
              language: file.language,
              bytes: file.content.length,
            })),
          },
        };
      }
      return {
        ok: true as const,
        artifact: {
          id: data.id,
          title: data.title,
          kind: data.kind,
          entry_path: data.entry_path,
          files: files.map((file) => ({
            path: file.path,
            language: file.language,
            content: file.content.slice(0, 24_000),
          })),
        },
      };
    },
  });

  const remember = tool({
    description: "Store a key/value preference for this project thread (brand, stack, tone).",
    inputSchema: z.object({
      key: z.string().min(1).max(120),
      value: z.string().min(1).max(2000),
    }),
    execute: async ({ key, value }) => {
      if (!f.remember) return { ok: false as const, error: "remember is disabled" };
      const res = await upsertMemory(supabase, threadId, key, value);
      if (!res.ok) return { ok: false as const, error: res.error };
      return {
        ok: true as const,
        key,
        remembered: true,
        previous: res.previous ?? null,
      };
    },
  });

  const fetch_url = tool({
    description:
      "Fetch a public http(s) URL and return plain text (HTML stripped). Use for docs/API pages. Blocked for private IPs.",
    inputSchema: z.object({
      url: z.string().url().max(2000),
    }),
    execute: async ({ url }) => {
      if (!f.fetch_url) return { ok: false as const, error: "fetch_url is disabled in agent settings" };
      return fetchUrlText(url);
    },
  });

  const web_search = tool({
    description:
      "Search the web for grounding (requires SEARCH_API_KEY on server). Returns top snippets + urls.",
    inputSchema: z.object({
      query: z.string().min(2).max(400),
      max_results: z.number().int().min(1).max(8).optional().default(5),
    }),
    execute: async ({ query, max_results }) => {
      if (!f.web_search) return { ok: false as const, error: "web_search is disabled in agent settings" };
      return webSearch(query, { maxResults: max_results });
    },
  });

  const grounding =
    f.web_search || f.fetch_url
      ? {
          ...(f.web_search ? { web_search } : {}),
          ...(f.fetch_url ? { fetch_url } : {}),
        }
      : {};

  if (mode === "plan") {
    const plan_steps = tool({
      description: "Return a structured implementation plan (Plan mode).",
      inputSchema: z.object({
        goal: z.string().min(1).max(400),
        steps: z.array(z.string().min(1).max(300)).min(1).max(8),
        risks: z.array(z.string().min(1).max(300)).max(6).default([]),
        open_questions: z.array(z.string().min(1).max(300)).max(6).default([]),
        persist: z
          .boolean()
          .optional()
          .default(false)
          .describe("If true, also store plan under thread_memory key last_plan"),
      }),
      execute: async (plan) => {
        if (!f.plan_steps) return { ok: false as const, error: "plan_steps is disabled" };
        if (plan.persist && f.remember) {
          await upsertMemory(supabase, threadId, "last_plan", {
            goal: plan.goal,
            steps: plan.steps,
            risks: plan.risks,
            open_questions: plan.open_questions,
          });
        }
        return {
          ok: true as const,
          plan: {
            goal: plan.goal,
            steps: plan.steps,
            risks: plan.risks,
            open_questions: plan.open_questions,
          },
        };
      },
    });
    return { read_artifact, remember, plan_steps, ...grounding };
  }

  const create_artifact = tool({
    description:
      "Create a multi-file (or single-file) artifact on the live canvas for this thread. Prefer one cohesive artifact per turn.",
    inputSchema: z.object({
      title: z.string().min(1).max(120),
      kind: z.enum(["html", "markdown", "code"]).default("html"),
      entry_path: z.string().min(1).max(200).optional(),
      files: z
        .array(
          z.object({
            path: z.string().min(1).max(200),
            language: z.string().min(1).max(40),
            content: z.string().min(1),
          }),
        )
        .min(1)
        .max(40),
    }),
    execute: async ({ title, kind, entry_path, files: rawFiles }) => {
      if (!f.create_artifact) {
        return { ok: false as const, error: "create_artifact is disabled in agent settings" };
      }
      const sanitized = sanitizeFiles(rawFiles);
      if (!sanitized.ok) return { ok: false as const, error: sanitized.error };
      const files = sanitized.files;

      let entry = entry_path;
      if (entry) {
        const ep = sanitizeRelativePath(entry);
        if (!ep.ok) return { ok: false as const, error: `entry_path: ${ep.error}` };
        entry = ep.path;
      }
      const resolvedEntry =
        entry ??
        files.find((x) => /\.html?$/i.test(x.path))?.path ??
        files[0].path;
      const main = files.find((x) => x.path === resolvedEntry) ?? files[0];
      const { data, error } = await supabase
        .from("artifacts")
        .insert({
          thread_id: threadId,
          kind,
          title: title.slice(0, 120),
          content: main.content,
          files: asFiles(files),
          entry_path: resolvedEntry,
        })
        .select("id,title,kind,entry_path")
        .single();
      if (error) return { ok: false as const, error: error.message };
      await supabase
        .from("threads")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", threadId);
      return {
        ok: true as const,
        artifactId: data.id,
        title: data.title,
        kind: data.kind,
        filesCount: files.length,
      };
    },
  });

  const edit_file = tool({
    description:
      "Edit one file inside an existing artifact. Use search/replace when possible; otherwise full rewrite. Set replace_all for global replace.",
    inputSchema: z.object({
      artifact_id: z.string().uuid(),
      path: z.string().min(1).max(200),
      mode: z.enum(["search_replace", "rewrite"]).default("search_replace"),
      search: z.string().optional(),
      replace: z.string().optional(),
      replace_all: z.boolean().optional().default(false),
      content: z.string().optional(),
    }),
    execute: async (input) => {
      if (!f.edit_file) {
        return { ok: false as const, error: "edit_file is disabled in agent settings" };
      }
      const pathOk = sanitizeRelativePath(input.path);
      if (!pathOk.ok) return { ok: false as const, error: pathOk.error };

      const { data: art, error } = await supabase
        .from("artifacts")
        .select("id,thread_id,content,files,entry_path,title,kind")
        .eq("id", input.artifact_id)
        .eq("thread_id", threadId)
        .single();
      if (error || !art) return { ok: false as const, error: error?.message ?? "Artifact not found" };

      const files = parseFilesJson(art.files);
      if (!files.length) {
        files.push({
          path: art.entry_path || "index.html",
          language: art.kind === "markdown" ? "markdown" : "html",
          content: art.content,
        });
      }
      const idx = files.findIndex((x) => x.path === pathOk.path);
      if (idx < 0) {
        return {
          ok: false as const,
          error: `File not found: ${pathOk.path}. Available: ${files.map((x) => x.path).join(", ")}`,
        };
      }

      const prev = files[idx].content;
      let next: string;
      let beforeSnippet: string;
      let afterSnippet: string;
      let replacements = 0;

      if (input.mode === "rewrite") {
        if (input.content == null) {
          return { ok: false as const, error: "content is required for rewrite mode" };
        }
        const rew = applyRewrite(input.content);
        if (!rew.ok) return { ok: false as const, error: rew.error };
        next = rew.content;
        beforeSnippet = rew.beforeSnippet;
        afterSnippet = rew.afterSnippet;
      } else {
        const patch = applySearchReplace({
          content: prev,
          search: input.search ?? "",
          replace: input.replace,
          replace_all: input.replace_all,
        });
        if (!patch.ok) return { ok: false as const, error: patch.error };
        next = patch.content;
        beforeSnippet = patch.beforeSnippet;
        afterSnippet = patch.afterSnippet;
        replacements = patch.replacements;
      }

      const updated = files.map((x, i) => (i === idx ? { ...x, content: next } : x));
      const entry = art.entry_path || updated[0].path;
      const main = updated.find((x) => x.path === entry) ?? updated[0];
      const { error: upErr } = await supabase
        .from("artifacts")
        .update({
          files: asFiles(updated),
          content: main.content,
          title: art.title || inferTitle(main.content, pathOk.path),
        })
        .eq("id", art.id);
      if (upErr) return { ok: false as const, error: upErr.message };
      await supabase
        .from("threads")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", threadId);
      return {
        ok: true as const,
        artifactId: art.id,
        path: pathOk.path,
        bytes: next.length,
        replacements,
        beforeSnippet,
        afterSnippet,
      };
    },
  });

  return { create_artifact, edit_file, read_artifact, remember, ...grounding };
}
