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
  name: "get_thread",
  title: "Get thread with messages",
  description: "Fetch a single thread by id along with its messages in chronological order.",
  inputSchema: {
    thread_id: z.string().uuid().describe("Thread UUID."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ thread_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    const [thread, messages] = await Promise.all([
      sb.from("threads").select("*").eq("id", thread_id).maybeSingle(),
      sb
        .from("messages")
        .select("id, role, parts, created_at")
        .eq("thread_id", thread_id)
        .order("created_at"),
    ]);
    if (thread.error)
      return { content: [{ type: "text", text: thread.error.message }], isError: true };
    if (!thread.data)
      return { content: [{ type: "text", text: "Thread not found" }], isError: true };
    if (messages.error)
      return { content: [{ type: "text", text: messages.error.message }], isError: true };
    const payload = { thread: thread.data, messages: messages.data };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
