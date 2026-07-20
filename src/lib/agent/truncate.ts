/** Pure helpers for message history truncation (G0 / G-P0-1). */

export type TruncateMode = "edit_user" | "retry_assistant";

export type OrderedMessage = {
  id: string;
  /** ISO timestamp or any string sortable with localeCompare when ids differ */
  created_at?: string;
};

/**
 * Both modes: delete the anchor message and everything after it
 * (edit replaces the user turn; retry redoes the assistant turn).
 *
 * @returns ids to DELETE (empty if messageId not found)
 */
export function selectMessageIdsToDelete(
  ordered: OrderedMessage[],
  messageId: string,
  _mode: TruncateMode = "edit_user",
): string[] {
  const idx = ordered.findIndex((m) => m.id === messageId);
  if (idx < 0) return [];
  return ordered.slice(idx).map((m) => m.id);
}

/**
 * Fallback when client message id is not a DB uuid (streaming temp ids).
 * Keep the first `keepCount` messages (by order); delete the rest.
 */
export function selectMessageIdsToDeleteFromKeepCount(
  ordered: OrderedMessage[],
  keepCount: number,
): string[] {
  if (keepCount < 0) return ordered.map((m) => m.id);
  if (keepCount >= ordered.length) return [];
  return ordered.slice(keepCount).map((m) => m.id);
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(id: string): boolean {
  return UUID_RE.test(id);
}
