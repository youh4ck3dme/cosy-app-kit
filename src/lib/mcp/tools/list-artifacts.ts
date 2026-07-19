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
  name: "list_artifacts",
  title: "List artifacts",
  description: "List artifacts generated in the signed-in user's threads. Optionally filter by thread_id.",
  inputSchema: {
    thread_id: z.string().uuid().optional().describe("Optional thread UUID filter."),
    limit: z.number().int().min(1).max(100).optional().describe("Max artifacts to return. Default 20."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ thread_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    let q = supabaseForUser(ctx)
      .from("artifacts")
      .select("id, title, kind, thread_id, is_public, entry_path, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (thread_id) q = q.eq("thread_id", thread_id);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { artifacts: data },
    };
  },
});
