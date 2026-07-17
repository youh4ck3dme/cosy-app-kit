import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import { createLovableAiGatewayProvider, DEFAULT_SYSTEM_PROMPT } from "@/lib/ai-gateway.server";

type Mode = "build" | "plan";
type ChatBody = {
  threadId?: string;
  messages?: UIMessage[];
  mode?: Mode;
};

type ArtifactFile = { path: string; language: string; content: string };
type ParsedArtifact = {
  kind: "html" | "markdown" | "code";
  title: string;
  content: string;
  files: ArtifactFile[];
  entry_path: string | null;
};

// Match fenced blocks with an optional info-string, e.g.
//   ```html
//   ```tsx path=src/App.tsx
//   ```html path=index.html title="Landing"
const FENCE_RE = /```([^\n`]*)\n([\s\S]*?)```/g;

function parseMeta(info: string): { lang: string; path?: string; title?: string } {
  const parts = info.trim().split(/\s+/);
  const lang = (parts[0] ?? "").toLowerCase();
  const meta: { lang: string; path?: string; title?: string } = { lang };
  for (const p of parts.slice(1)) {
    const m = p.match(/^(path|title)=(?:"([^"]+)"|(\S+))/);
    if (m) {
      const key = m[1] as "path" | "title";
      meta[key] = m[2] ?? m[3];
    }
  }
  return meta;
}

function inferTitle(content: string, fallback: string): string {
  const t1 = content.match(/<title>([^<]+)<\/title>/i);
  const t2 = content.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const t3 = content.match(/^#\s+(.+)$/m);
  return (t1?.[1] ?? t2?.[1] ?? t3?.[1] ?? fallback).trim().slice(0, 120);
}

function extractArtifacts(text: string): ParsedArtifact[] {
  const blocks: Array<{ lang: string; path?: string; title?: string; content: string }> = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(FENCE_RE.source, "g");
  while ((m = re.exec(text)) !== null) {
    const meta = parseMeta(m[1]);
    const content = m[2].trimEnd();
    blocks.push({ ...meta, content });
  }
  if (!blocks.length) return [];

  // Multi-file artifact: consecutive `path=` blocks bundle into one artifact.
  const artifacts: ParsedArtifact[] = [];
  let buffer: typeof blocks = [];
  const flushMulti = () => {
    if (!buffer.length) return;
    const files: ArtifactFile[] = buffer.map((b) => ({
      path: b.path!,
      language: b.lang || "text",
      content: b.content,
    }));
    const entry =
      files.find((f) => /\.html?$/i.test(f.path)) ??
      files.find((f) => /index\./i.test(f.path)) ??
      files[0];
    const isHtml = /\.html?$/i.test(entry.path);
    artifacts.push({
      kind: isHtml ? "html" : "code",
      title: buffer.find((b) => b.title)?.title ?? inferTitle(entry.content, entry.path),
      content: entry.content,
      files,
      entry_path: entry.path,
    });
    buffer = [];
  };

  for (const b of blocks) {
    if (b.path) {
      buffer.push(b);
      continue;
    }
    flushMulti();
    // Standalone block — only html / markdown become artifacts.
    if (b.lang === "html") {
      artifacts.push({
        kind: "html",
        title: b.title ?? inferTitle(b.content, "Artifact"),
        content: b.content,
        files: [{ path: "index.html", language: "html", content: b.content }],
        entry_path: "index.html",
      });
    } else if (b.lang === "markdown" || b.lang === "md") {
      artifacts.push({
        kind: "markdown",
        title: b.title ?? inferTitle(b.content, "Document"),
        content: b.content,
        files: [{ path: "README.md", language: "markdown", content: b.content }],
        entry_path: "README.md",
      });
    }
  }
  flushMulti();
  return artifacts;
}

function messageText(m: UIMessage): string {
  return (m.parts ?? []).map((p) => (p.type === "text" ? p.text : "")).join("");
}

const PLAN_PROMPT = `You are Builder in PLAN MODE. Do NOT write full code or emit fenced code artifacts.
Instead, produce a crisp, numbered implementation plan:
1. Clarify the goal in one sentence.
2. List the concrete steps (max 8), each with the file(s) or change involved.
3. Call out risks, unknowns, and what to verify.
End with a one-line question inviting the user to confirm or adjust before you build.`;

const BUILD_SUFFIX = `\n\nWhen the user asks for a webpage or component, respond with a short explanation and then emit ONE of:
- A single self-contained HTML document in a \`\`\`html fenced block.
- A multi-file artifact using \`\`\`lang path=<relative/path>\`\`\` blocks (each file is one block). Include an \`index.html\` as the entry file when possible.
Prefer semantic HTML, inline <style>, tasteful modern design, and accessible markup.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as ChatBody;
        if (!body.threadId || !Array.isArray(body.messages)) {
          return new Response("Missing threadId or messages", { status: 400 });
        }
        const mode: Mode = body.mode === "plan" ? "plan" : "build";

        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          return new Response("Unauthorized", { status: 401 });
        }
        const token = authHeader.slice("Bearer ".length);

        const supabaseUrl = process.env.SUPABASE_URL!;
        const supabasePub = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const lovableKey = process.env.LOVABLE_API_KEY;
        if (!lovableKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const supabase = createClient<Database>(supabaseUrl, supabasePub, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
        });
        const { data: userData, error: userErr } = await supabase.auth.getUser(token);
        if (userErr || !userData.user) return new Response("Unauthorized", { status: 401 });

        const { data: thread, error: tErr } = await supabase
          .from("threads")
          .select("id,model,temperature,system_prompt,title")
          .eq("id", body.threadId)
          .single();
        if (tErr || !thread) return new Response("Thread not found", { status: 404 });

        const lastUser = [...body.messages].reverse().find((m) => m.role === "user");
        if (lastUser) {
          await supabase.from("messages").insert({
            thread_id: thread.id,
            role: "user",
            parts: lastUser.parts as unknown as Json,
          });
        }
        if (thread.title === "New chat" && lastUser) {
          const title = messageText(lastUser).slice(0, 60).trim();
          if (title) await supabase.from("threads").update({ title }).eq("id", thread.id);
        }

        const provider = createLovableAiGatewayProvider(lovableKey);
        const model = provider(thread.model);
        const baseSystem = thread.system_prompt || DEFAULT_SYSTEM_PROMPT;
        const system = mode === "plan" ? `${baseSystem}\n\n${PLAN_PROMPT}` : `${baseSystem}${BUILD_SUFFIX}`;

        const result = streamText({
          model,
          system,
          temperature: Number(thread.temperature ?? 0.7),
          messages: await convertToModelMessages(body.messages as UIMessage[]),
          onFinish: async ({ text }) => {
            const { data: inserted } = await supabase
              .from("messages")
              .insert({
                thread_id: thread.id,
                role: "assistant",
                parts: [{ type: "text", text }] as unknown as Json,
              })
              .select("id")
              .single();

            if (mode === "build") {
              const artifacts = extractArtifacts(text);
              if (artifacts.length) {
                await supabase.from("artifacts").insert(
                  artifacts.map((a) => ({
                    thread_id: thread.id,
                    message_id: inserted?.id ?? null,
                    kind: a.kind,
                    title: a.title,
                    content: a.content,
                    files: a.files as unknown as Json,
                    entry_path: a.entry_path,
                  })),
                );
              }
            }
            await supabase.from("threads").update({ updated_at: new Date().toISOString() }).eq("id", thread.id);
          },
        });

        return result.toUIMessageStreamResponse({
          originalMessages: body.messages as UIMessage[],
        });
      },
    },
  },
});
