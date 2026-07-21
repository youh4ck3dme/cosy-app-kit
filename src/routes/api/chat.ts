import { createFileRoute } from "@tanstack/react-router";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import {
  PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  PUBLIC_SUPABASE_URL,
} from "@/integrations/supabase/public-config";
import {
  createMistralProvider,
  DEFAULT_SYSTEM_PROMPT,
  formatAiGatewayError,
} from "@/lib/ai-gateway.server";
import { resolveModelForMode } from "@/lib/models";
import { extractArtifacts } from "@/lib/agent/artifacts";
import { composeSystem, formatClientContext, type ClientPreviewContext } from "@/lib/agent/prompts";
import { formatMemoryBlock, loadThreadMemory } from "@/lib/agent/memory";
import { buildTools, type ToolFlags } from "@/lib/agent/tools";
import {
  collectToolResultsFromSteps,
  shouldFenceArtifacts,
  summarizeToolResults,
  toolCreatedArtifact,
  type ToolResultLike,
} from "@/lib/agent/finish";
import { toolResultsToDataParts } from "@/lib/agent/stream-parts";
import { snapshotArtifactVersion } from "@/lib/agent/versions";

type Mode = "build" | "plan";
type ChatBody = {
  threadId?: string;
  messages?: UIMessage[];
  mode?: Mode;
  /** Optional host viewport hint for mobile-first generation (MR-40 M3). */
  clientContext?: ClientPreviewContext;
};

/** Keep last N UI messages to reduce latency/cost (M4 context trim). */
const MAX_CONTEXT_MESSAGES = 24;

function messageText(m: UIMessage): string {
  return (m.parts ?? []).map((p) => (p.type === "text" ? p.text : "")).join("");
}

function trimMessages(messages: UIMessage[]): UIMessage[] {
  if (messages.length <= MAX_CONTEXT_MESSAGES) return messages;
  return messages.slice(-MAX_CONTEXT_MESSAGES);
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
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

          const supabaseUrl = process.env.SUPABASE_URL || PUBLIC_SUPABASE_URL;
          const supabasePub =
            process.env.SUPABASE_PUBLISHABLE_KEY || PUBLIC_SUPABASE_PUBLISHABLE_KEY;

          const supabase = createClient<Database>(supabaseUrl, supabasePub, {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
          });
          const { data: userData, error: userErr } = await supabase.auth.getUser(token);
          if (userErr || !userData.user) return new Response("Unauthorized", { status: 401 });

          const mistralKey = (process.env.MISTRAL_API_KEY ?? process.env.MISTRAL_KEY ?? "").trim();
          if (!mistralKey) {
            return new Response(
              "Missing MISTRAL_API_KEY. Lovable Cloud → Secrets → add MISTRAL_API_KEY (from console.mistral.ai). Do not use LOVABLE_API_KEY / OpenAI.",
              {
                status: 500,
                headers: {
                  "content-type": "text/plain; charset=utf-8",
                  "x-builder-ai": "mistral-direct-1",
                },
              },
            );
          }

          const { data: thread, error: tErr } = await supabase
            .from("threads")
            .select("id,model,temperature,system_prompt,title")
            .eq("id", body.threadId)
            .single();
          if (tErr || !thread) return new Response("Thread not found", { status: 404 });

          const { data: settings } = await supabase
            .from("agent_settings")
            .select("tools")
            .eq("user_id", userData.user.id)
            .maybeSingle();
          const toolFlags = (settings?.tools ?? {}) as ToolFlags;

          const lastUser = [...body.messages].reverse().find((m) => m.role === "user");
          if (lastUser) {
            const { error: insErr } = await supabase.from("messages").insert({
              thread_id: thread.id,
              role: "user",
              parts: lastUser.parts as unknown as Json,
            });
            if (insErr) console.error("[api/chat] user message insert failed", insErr);
          }
          if (thread.title === "New chat" && lastUser) {
            const title = messageText(lastUser).slice(0, 60).trim();
            if (title) await supabase.from("threads").update({ title }).eq("id", thread.id);
          }

          const modelId = resolveModelForMode(thread.model, mode);
          if (modelId !== thread.model) {
            console.warn(`[api/chat] model "${thread.model}" → "${modelId}" (mode=${mode})`);
          }

          const memoryRows = await loadThreadMemory(supabase, thread.id);
          const memoryBlock = formatMemoryBlock(memoryRows);
          const clientBlock = formatClientContext(body.clientContext);
          const system = composeSystem(
            mode,
            thread.system_prompt || DEFAULT_SYSTEM_PROMPT,
            memoryBlock,
            clientBlock,
          );
          const temperature = Number(thread.temperature ?? 0.7);

          const trimmed = trimMessages(body.messages as UIMessage[]);
          let modelMessages;
          try {
            modelMessages = await convertToModelMessages(trimmed);
          } catch (convErr) {
            console.error("[api/chat] convertToModelMessages failed", convErr);
            return new Response(`Invalid messages payload: ${formatAiGatewayError(convErr)}`, {
              status: 400,
            });
          }

          const tools = buildTools({
            mode,
            threadId: thread.id,
            supabase,
            flags: toolFlags,
            activeArtifactId: body.clientContext?.activeArtifactId,
          });

          const persistAssistant = async (
            text: string,
            usedModelId: string,
            toolResults: ToolResultLike[],
          ) => {
            const toolSummary = summarizeToolResults(toolResults);
            const bodyText = text?.trim() || toolSummary;
            if (!bodyText) {
              console.warn("[api/chat] empty assistant text and no tool summary", {
                usedModelId,
              });
              return;
            }

            const { data: inserted, error: aErr } = await supabase
              .from("messages")
              .insert({
                thread_id: thread.id,
                role: "assistant",
                parts: [{ type: "text", text: bodyText }] as unknown as Json,
              })
              .select("id")
              .single();
            if (aErr) {
              console.error("[api/chat] assistant insert failed", aErr);
              return;
            }

            // Fence fallback only when tools did not create an artifact (G-P1-1).
            const createdViaTool = toolCreatedArtifact(toolResults);
            if (
              shouldFenceArtifacts({
                mode,
                createArtifactEnabled: toolFlags.create_artifact !== false,
                toolCreatedArtifact: createdViaTool,
              })
            ) {
              const artifacts = extractArtifacts(text);
              if (artifacts.length) {
                const { data: insertedArts, error: artErr } = await supabase
                  .from("artifacts")
                  .insert(
                    artifacts.map((a) => ({
                      thread_id: thread.id,
                      message_id: inserted?.id ?? null,
                      kind: a.kind,
                      title: a.title,
                      content: a.content,
                      files: a.files as unknown as Json,
                      entry_path: a.entry_path,
                    })),
                  )
                  .select("id,title,content,files,entry_path");
                if (artErr) {
                  console.error("[api/chat] artifacts insert failed", artErr);
                } else if (insertedArts?.length) {
                  for (const row of insertedArts) {
                    await snapshotArtifactVersion(supabase, {
                      artifactId: row.id,
                      files: row.files,
                      content: row.content,
                      entry_path: row.entry_path,
                      title: row.title,
                      message_id: inserted?.id ?? null,
                      source: "fence",
                    });
                  }
                }
              }
            }
            await supabase
              .from("threads")
              .update({ updated_at: new Date().toISOString(), model: usedModelId })
              .eq("id", thread.id);
          };

          const provider = createMistralProvider(mistralKey);
          const originalMessages = body.messages as UIMessage[];

          // Wrap stream so we can emit transient data-* parts for Cursor toasts/canvas.
          const uiStream = createUIMessageStream({
            originalMessages,
            execute: async ({ writer }) => {
              const result = streamText({
                model: provider(modelId),
                system,
                temperature,
                messages: modelMessages,
                tools,
                stopWhen: stepCountIs(mode === "plan" ? 12 : 25),
                onError: ({ error }) => {
                  console.error("[api/chat] streamText error", {
                    modelId,
                    threadId: thread.id,
                    error,
                  });
                },
                onStepFinish: ({ toolResults }) => {
                  const parts = toolResultsToDataParts(
                    (toolResults ?? []) as ToolResultLike[],
                  );
                  for (const part of parts) {
                    try {
                      writer.write(part as Parameters<typeof writer.write>[0]);
                    } catch (e) {
                      console.warn("[api/chat] data part write failed", e);
                    }
                  }
                },
                onFinish: async ({ text, steps, toolResults }) => {
                  try {
                    const fromSteps = collectToolResultsFromSteps(steps);
                    const allTools: ToolResultLike[] =
                      fromSteps.length > 0
                        ? fromSteps
                        : ((toolResults ?? []) as ToolResultLike[]);
                    await persistAssistant(text, modelId, allTools);
                  } catch (finishErr) {
                    console.error("[api/chat] onFinish failed", finishErr);
                  }
                },
              });

              writer.merge(
                result.toUIMessageStream({
                  originalMessages,
                }),
              );
            },
            onError: (error) => formatAiGatewayError(error),
          });

          return createUIMessageStreamResponse({ stream: uiStream });
        } catch (err) {
          console.error("[api/chat] unhandled", err);
          return new Response(formatAiGatewayError(err), { status: 500 });
        }
      },
    },
  },
});
