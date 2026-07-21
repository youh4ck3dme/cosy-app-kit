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
import { analyzeProjectRuntime } from "@/lib/agent/project-runtime-gate";
import { formatUnverified, validateProject } from "@/lib/agent/project-validate";
import { fetchUrlText, webSearch } from "@/lib/agent/web";
import { snapshotArtifactVersion } from "@/lib/agent/versions";

type Client = SupabaseClient<Database>;

export type ToolFlags = {
  create_artifact?: boolean;
  edit_file?: boolean;
  read_artifact?: boolean;
  remember?: boolean;
  plan_steps?: boolean;
  web_search?: boolean;
  fetch_url?: boolean;
  /** Multi-page mini-site pipeline (LMAP). Default on in Build. */
  launch_site?: boolean;
  list_project_files?: boolean;
  read_project_file?: boolean;
  write_project_file?: boolean;
  validate_project_structure?: boolean;
  validate_links?: boolean;
  validate_javascript_syntax?: boolean;
  run_project_smoke?: boolean;
};

export type BuildToolsArgs = {
  mode: "build" | "plan";
  threadId: string;
  supabase: Client;
  flags?: ToolFlags;
  /** Preferred artifact for QA/edit when client focuses canvas. */
  activeArtifactId?: string | null;
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

export function buildTools({
  mode,
  threadId,
  supabase,
  flags,
  activeArtifactId,
}: BuildToolsArgs): ToolSet {
  const f = {
    create_artifact: flags?.create_artifact !== false,
    edit_file: flags?.edit_file !== false,
    read_artifact: flags?.read_artifact !== false,
    remember: flags?.remember !== false,
    plan_steps: flags?.plan_steps !== false,
    web_search: flags?.web_search === true,
    fetch_url: flags?.fetch_url === true,
    launch_site: flags?.launch_site !== false,
    list_project_files: flags?.list_project_files !== false,
    read_project_file: flags?.read_project_file !== false,
    write_project_file: flags?.write_project_file !== false,
    validate_project_structure: flags?.validate_project_structure !== false,
    validate_links: flags?.validate_links !== false,
    validate_javascript_syntax: flags?.validate_javascript_syntax !== false,
    run_project_smoke: flags?.run_project_smoke !== false,
  };

  async function loadArtifactRow(artifact_id?: string) {
    const select = "id,title,kind,entry_path,content,files,created_at";
    if (artifact_id) {
      const res = await supabase
        .from("artifacts")
        .select(select)
        .eq("id", artifact_id)
        .eq("thread_id", threadId)
        .maybeSingle();
      return res.data;
    }
    const preferred = activeArtifactId?.trim();
    if (preferred) {
      const res = await supabase
        .from("artifacts")
        .select(select)
        .eq("id", preferred)
        .eq("thread_id", threadId)
        .maybeSingle();
      if (res.data) return res.data;
    }
    const res = await supabase
      .from("artifacts")
      .select(select)
      .eq("thread_id", threadId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return res.data;
  }

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
      "Create a multi-file (or single-file) artifact on the live canvas for this thread. For multi-page apps (dashboard + list pages + shared app.js/styles.css), pass ALL files in one call so ZIP export is complete. Prefer one cohesive artifact per turn. Tool returns quality score for project-runtime gates — fix hardFails with edit_file before finishing.",
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
      const quality = analyzeProjectRuntime(files);
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
      await snapshotArtifactVersion(supabase, {
        artifactId: data.id,
        files,
        content: main.content,
        entry_path: resolvedEntry,
        title: data.title,
        source: "tool",
      });
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
        entry_path: resolvedEntry,
        quality: {
          score: quality.score,
          ok: quality.ok,
          hardFails: quality.hardFails,
          softFails: quality.softFails,
          hints: quality.hints.slice(0, 6),
          externalUrlCount: quality.externalUrlCount,
        },
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
      const quality = analyzeProjectRuntime(updated);
      const { error: upErr } = await supabase
        .from("artifacts")
        .update({
          files: asFiles(updated),
          content: main.content,
          title: art.title || inferTitle(main.content, pathOk.path),
        })
        .eq("id", art.id);
      if (upErr) return { ok: false as const, error: upErr.message };
      await snapshotArtifactVersion(supabase, {
        artifactId: art.id,
        files: updated,
        content: main.content,
        entry_path: entry,
        title: art.title,
        source: "tool",
      });
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
        quality: {
          score: quality.score,
          ok: quality.ok,
          hardFails: quality.hardFails,
          softFails: quality.softFails,
          hints: quality.hints.slice(0, 6),
        },
      };
    },
  });

  const launch_site = tool({
    description:
      "Build a 4-page mini-site (Home/About/Contact/Pricing) from a business brief via blueprint + parallel HTML workers. Use for multi-page / celý web / Home+About+Contact+Cenník requests instead of a single HTML with fake links.",
    inputSchema: z.object({
      brief: z.string().min(10).max(4000),
    }),
    execute: async ({ brief }) => {
      if (!f.launch_site) {
        return { ok: false as const, error: "launch_site is disabled in agent settings" };
      }
      try {
        const { runLaunchPipeline } = await import("@/lib/launch/orchestrate");
        const result = await runLaunchPipeline(brief);
        const { assembled, timings, pageFallbacks } = result;
        const sanitized = sanitizeFiles(
          assembled.files.map((x) => ({
            path: x.path,
            language: x.language,
            content: x.content,
          })),
        );
        if (!sanitized.ok) return { ok: false as const, error: sanitized.error };
        const files = sanitized.files;
        const resolvedEntry = assembled.entry_path;
        const main = files.find((x) => x.path === resolvedEntry) ?? files[0]!;
        const { data, error } = await supabase
          .from("artifacts")
          .insert({
            thread_id: threadId,
            kind: "html",
            title: assembled.title.slice(0, 120),
            content: main.content,
            files: asFiles(files),
            entry_path: resolvedEntry,
          })
          .select("id,title,kind,entry_path")
          .single();
        if (error) return { ok: false as const, error: error.message };
        await snapshotArtifactVersion(supabase, {
          artifactId: data.id,
          files,
          content: main.content,
          entry_path: resolvedEntry,
          title: data.title,
          source: "tool",
        });
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
          entry_path: resolvedEntry,
          timings,
          pageFallbacks,
        };
      } catch (e) {
        return {
          ok: false as const,
          error: e instanceof Error ? e.message : String(e),
        };
      }
    },
  });

  const list_project_files = tool({
    description:
      "List file paths in the current (or specified) artifact. Prefer this over inventing file trees.",
    inputSchema: z.object({
      artifact_id: z.string().uuid().optional(),
    }),
    execute: async ({ artifact_id }) => {
      if (!f.list_project_files) {
        return {
          status: "unverified" as const,
          message: formatUnverified("list_project_files is disabled"),
        };
      }
      const row = await loadArtifactRow(artifact_id);
      if (!row) {
        return { ok: false as const, error: "Artifact not found in this thread" };
      }
      const files = parseFilesJson(row.files);
      const paths =
        files.length > 0
          ? files.map((x) => x.path)
          : [row.entry_path || (row.kind === "markdown" ? "README.md" : "index.html")];
      return {
        ok: true as const,
        artifactId: row.id,
        entry_path: row.entry_path,
        paths,
        fileCount: paths.length,
      };
    },
  });

  const read_project_file = tool({
    description: "Read one file from an artifact by path. Do not invent content.",
    inputSchema: z.object({
      artifact_id: z.string().uuid().optional(),
      path: z.string().min(1).max(240),
    }),
    execute: async ({ artifact_id, path }) => {
      if (!f.read_project_file) {
        return {
          status: "unverified" as const,
          message: formatUnverified("read_project_file is disabled"),
        };
      }
      const clean = sanitizeRelativePath(path);
      if (!clean.ok) return { ok: false as const, error: clean.error };
      const row = await loadArtifactRow(artifact_id);
      if (!row) return { ok: false as const, error: "Artifact not found" };
      const files = parseFilesJson(row.files);
      const hit =
        files.find((x) => x.path === clean.path) ??
        (row.entry_path === clean.path || (!files.length && clean.path === "index.html")
          ? {
              path: clean.path,
              language: row.kind,
              content: row.content,
            }
          : null);
      if (!hit) return { ok: false as const, error: `File not found: ${clean.path}` };
      const content =
        hit.content.length > 24_000
          ? hit.content.slice(0, 24_000) + "\n/* …truncated… */"
          : hit.content;
      return {
        ok: true as const,
        artifactId: row.id,
        path: hit.path,
        language: hit.language,
        content,
        truncated: hit.content.length > 24_000,
      };
    },
  });

  const write_project_file = tool({
    description:
      "Write/replace one file in an existing artifact (does not create a new artifact).",
    inputSchema: z.object({
      artifact_id: z.string().uuid(),
      path: z.string().min(1).max(240),
      content: z.string().min(1),
      language: z.string().max(40).optional(),
    }),
    execute: async ({ artifact_id, path, content, language }) => {
      if (!f.write_project_file) {
        return {
          status: "unverified" as const,
          message: formatUnverified("write_project_file is disabled"),
        };
      }
      if (!f.edit_file) {
        return {
          status: "unverified" as const,
          message: formatUnverified("edit_file is disabled"),
        };
      }
      const clean = sanitizeRelativePath(path);
      if (!clean.ok) return { ok: false as const, error: clean.error };
      const rewritten = applyRewrite(content);
      if (!rewritten.ok) return { ok: false as const, error: rewritten.error };
      const row = await loadArtifactRow(artifact_id);
      if (!row) return { ok: false as const, error: "Artifact not found" };
      let files = parseFilesJson(row.files);
      if (!files.length) {
        files = [
          {
            path: row.entry_path || "index.html",
            language: row.kind,
            content: row.content,
          },
        ];
      }
      const idx = files.findIndex((x) => x.path === clean.path);
      const nextFile: ArtifactFile = {
        path: clean.path,
        language: (language ?? files[idx]?.language ?? "text").slice(0, 40),
        content: rewritten.content,
      };
      if (idx >= 0) files[idx] = nextFile;
      else files.push(nextFile);
      const entry = row.entry_path || files.find((x) => /\.html?$/i.test(x.path))?.path || files[0]!.path;
      const main = files.find((x) => x.path === entry) ?? files[0]!;
      const { error } = await supabase
        .from("artifacts")
        .update({
          files: asFiles(files),
          content: main.content,
          entry_path: entry,
        })
        .eq("id", row.id);
      if (error) return { ok: false as const, error: error.message };
      await snapshotArtifactVersion(supabase, {
        artifactId: row.id,
        files,
        content: main.content,
        entry_path: entry,
        title: row.title,
        source: "tool",
      });
      const quality = analyzeProjectRuntime(files);
      return {
        ok: true as const,
        artifactId: row.id,
        path: clean.path,
        filesCount: files.length,
        quality,
      };
    },
  });

  const validate_project_structure = tool({
    description: "Deterministic project structure validation (entry, paths, duplicates).",
    inputSchema: z.object({ artifact_id: z.string().uuid().optional() }),
    execute: async ({ artifact_id }) => {
      if (!f.validate_project_structure) {
        return {
          status: "unverified" as const,
          message: formatUnverified("validate_project_structure is disabled"),
        };
      }
      const row = await loadArtifactRow(artifact_id);
      if (!row) return { ok: false as const, error: "Artifact not found" };
      const files = parseFilesJson(row.files);
      const pack =
        files.length > 0
          ? files
          : [{ path: row.entry_path || "index.html", content: row.content }];
      const result = validateProject(pack, { entryPath: row.entry_path });
      return {
        ok: true as const,
        artifactId: row.id,
        status: result.status,
        checks: result.checks,
        score: result.score,
        validationOk: result.ok,
      };
    },
  });

  const validate_links = tool({
    description: "Check relative href/src targets resolve inside the artifact package.",
    inputSchema: z.object({ artifact_id: z.string().uuid().optional() }),
    execute: async ({ artifact_id }) => {
      if (!f.validate_links) {
        return {
          status: "unverified" as const,
          message: formatUnverified("validate_links is disabled"),
        };
      }
      const row = await loadArtifactRow(artifact_id);
      if (!row) return { ok: false as const, error: "Artifact not found" };
      const files = parseFilesJson(row.files);
      const pack =
        files.length > 0
          ? files
          : [{ path: row.entry_path || "index.html", content: row.content }];
      const result = validateProject(pack, { entryPath: row.entry_path });
      const linkChecks = result.checks.filter(
        (c) => c.id === "relative-links" || c.id.startsWith("link:"),
      );
      const failed = linkChecks.some((c) => c.status === "fail");
      return {
        ok: true as const,
        artifactId: row.id,
        status: failed ? ("fail" as const) : ("pass" as const),
        checks: linkChecks,
      };
    },
  });

  const validate_javascript_syntax = tool({
    description: "Parse JavaScript files with a real parser (acorn). Never guess PASS.",
    inputSchema: z.object({ artifact_id: z.string().uuid().optional() }),
    execute: async ({ artifact_id }) => {
      if (!f.validate_javascript_syntax) {
        return {
          status: "unverified" as const,
          message: formatUnverified("validate_javascript_syntax is disabled"),
        };
      }
      const row = await loadArtifactRow(artifact_id);
      if (!row) return { ok: false as const, error: "Artifact not found" };
      const files = parseFilesJson(row.files);
      const pack =
        files.length > 0
          ? files
          : [{ path: row.entry_path || "index.html", content: row.content }];
      const result = validateProject(pack, { entryPath: row.entry_path });
      const jsChecks = result.checks.filter((c) => c.id.startsWith("javascript-syntax"));
      const failed = jsChecks.some((c) => c.status === "fail");
      return {
        ok: true as const,
        artifactId: row.id,
        status: jsChecks.length === 0 ? ("pass" as const) : failed ? ("fail" as const) : ("pass" as const),
        checks: jsChecks.length
          ? jsChecks
          : [{ id: "javascript-syntax", status: "pass" as const, evidence: "No JS files to parse" }],
      };
    },
  });

  const run_project_smoke = tool({
    description:
      "Static smoke: entry + links + JS syntax. Does NOT run a browser — never claim visual PASS.",
    inputSchema: z.object({ artifact_id: z.string().uuid().optional() }),
    execute: async ({ artifact_id }) => {
      if (!f.run_project_smoke) {
        return {
          status: "unverified" as const,
          message: formatUnverified("run_project_smoke is disabled"),
        };
      }
      const row = await loadArtifactRow(artifact_id);
      if (!row) return { ok: false as const, error: "Artifact not found" };
      const files = parseFilesJson(row.files);
      const pack =
        files.length > 0
          ? files
          : [{ path: row.entry_path || "index.html", content: row.content }];
      const result = validateProject(pack, { entryPath: row.entry_path });
      return {
        ok: true as const,
        artifactId: row.id,
        smoke: "static" as const,
        note: "Static checks only — not a live browser smoke.",
        status: result.status,
        checks: result.checks,
        score: result.score,
        validationOk: result.ok,
      };
    },
  });

  return {
    create_artifact,
    edit_file,
    read_artifact,
    remember,
    launch_site,
    list_project_files,
    read_project_file,
    write_project_file,
    validate_project_structure,
    validate_links,
    validate_javascript_syntax,
    run_project_smoke,
    ...grounding,
  };
}
