import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { createLovableAiGatewayProvider, DEFAULT_SYSTEM_PROMPT } from "@/lib/ai-gateway.server";

type ChatBody = {
  threadId?: string;
  messages?: UIMessage[];
};

function extractArtifacts(text: string): Array<{ kind: "html" | "markdown" | "code"; title: string; content: string }> {
  const out: Array<{ kind: "html" | "markdown" | "code"; title: string; content: string }> = [];
  const re = /```(html|markdown|md)\s*\n([\s\S]*?)```/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const rawKind = m[1].toLowerCase();
    const kind = rawKind === "html" ? "html" : "markdown";
    const content = m[2].trim();
    // Title heuristic: first <title>, first <h1>, or first markdown # heading
    let title = "Artifact";
    const t1 = content.match(/<title>([^<]+)<\/title>/i);
    const t2 = content.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    const t3 = content.match(/^#\s+(.+)$/m);
    if (t1) title = t1[1].trim();
    else if (t2) title = t2[1].trim();
    else if (t3) title = t3[1].trim();
    out.push({ kind, title: title.slice(0, 120), content });
  }
  return out;
}

function messageText(m: UIMessage): string {
  return (m.parts ?? [])
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("");
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as ChatBody;
        if (!body.threadId || !Array.isArray(body.messages)) {
          return new Response("Missing threadId or messages", { status: 400 });
        }

        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          return new Response("Unauthorized", { status: 401 });
        }
        const token = authHeader.slice("Bearer ".length);

        const supabaseUrl = process.env.SUPABASE_URL!;
        const supabasePub = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const lovableKey = process.env.LOVABLE_API_KEY;
        if (!lovableKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        // Auth-scoped client (RLS as user)
        const supabase = createClient<Database>(supabaseUrl, supabasePub, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
        });
        const { data: userData, error: userErr } = await supabase.auth.getUser(token);
        if (userErr || !userData.user) return new Response("Unauthorized", { status: 401 });

        // Load thread config (RLS ensures ownership)
        const { data: thread, error: tErr } = await supabase
          .from("threads")
          .select("id,model,temperature,system_prompt,title")
          .eq("id", body.threadId)
          .single();
        if (tErr || !thread) return new Response("Thread not found", { status: 404 });

        // Persist the latest user message (the last one in the array).
        const lastUser = [...body.messages].reverse().find((m) => m.role === "user");
        if (lastUser) {
          const alreadyExists = await supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("thread_id", thread.id)
            .eq("role", "user")
            .order("created_at", { ascending: false })
            .limit(1);
          // Always insert user messages sent this turn — simplest to just append.
          await supabase.from("messages").insert({
            thread_id: thread.id,
            role: "user",
            parts: lastUser.parts as unknown as import("@/integrations/supabase/types").Json,
          });
          void alreadyExists;
        }

        // Auto-title from first user message if title is still default.
        if (thread.title === "New chat" && lastUser) {
          const title = messageText(lastUser).slice(0, 60).trim();
          if (title) {
            await supabase.from("threads").update({ title }).eq("id", thread.id);
          }
        }

        const provider = createLovableAiGatewayProvider(lovableKey);
        const model = provider(thread.model);
        const system = thread.system_prompt || DEFAULT_SYSTEM_PROMPT;

        const result = streamText({
          model,
          system,
          temperature: Number(thread.temperature ?? 0.7),
          messages: convertToModelMessages(body.messages as UIMessage[]),
          onFinish: async ({ text }) => {
            const { data: inserted } = await supabase
              .from("messages")
              .insert({
                thread_id: thread.id,
                role: "assistant",
                parts: [{ type: "text", text }] as unknown as import("@/integrations/supabase/types").Json,
              })
              .select("id")
              .single();

            // Extract artifacts
            const artifacts = extractArtifacts(text);
            if (artifacts.length) {
              await supabase.from("artifacts").insert(
                artifacts.map((a) => ({
                  thread_id: thread.id,
                  message_id: inserted?.id ?? null,
                  kind: a.kind,
                  title: a.title,
                  content: a.content,
                })),
              );
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
