import { toast } from "sonner";
import { isUuid } from "@/lib/agent/truncate";

export type TruncateThreadMessagesFn = (args: {
  data: {
    threadId: string;
    messageId?: string;
    mode: "edit_user" | "retry_assistant";
    keepCount?: number;
  };
}) => Promise<{ ok: true; deleted: number; reason?: string }>;

/**
 * Call server truncate before edit/retry.
 * - UUID messageId → delete from that row (and after)
 * - Always pass keepCount = messageIndex as fallback for temp client ids
 * Throws after toast on failure so callers do not stream on top of old history.
 */
export async function truncateThreadMessagesClient(
  call: TruncateThreadMessagesFn,
  args: {
    threadId: string;
    messageId: string;
    messageIndex: number;
    mode: "edit_user" | "retry_assistant";
  },
): Promise<void> {
  const data: {
    threadId: string;
    messageId?: string;
    mode: "edit_user" | "retry_assistant";
    keepCount?: number;
  } = {
    threadId: args.threadId,
    mode: args.mode,
    keepCount: args.messageIndex,
  };
  if (isUuid(args.messageId)) {
    data.messageId = args.messageId;
  }

  try {
    await call({ data });
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Failed to sync history");
    throw e;
  }
}
