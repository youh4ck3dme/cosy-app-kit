import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "create_thread",
  title: "Create a new thread",
  description: "Create a new empty chat thread for the signed-in user.",
  inputSchema: {
    title: z.string().trim().min(1).max(200).describe("Thread title."),
    model: z.string().optional().describe("Model id, e.g. openai/gpt-5.5. Optional."),
    system_prompt: z.string().optional().describe("Optional default system prompt for this thread."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ title, model, system_prompt }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const row: Record<string, unknown> = { user_id: ctx.getUserId(), title };
    if (model) row.model = model;
    if (system_prompt !== undefined) row.system_prompt = system_prompt;
    const { data, error } = await supabaseForUser(ctx).from("threads").insert(row).select().single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Created thread ${data.id}` }],
      structuredContent: { thread: data },
    };
  },
});
