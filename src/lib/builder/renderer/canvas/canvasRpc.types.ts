/** PostMessage RPC contracts for sandboxed canvas (preview isolation checklist). */

export type CanvasRpcMessageType =
  | "INIT_DOCUMENT"
  | "UPDATE_NODE"
  | "SELECT_NODE"
  | "NODE_SELECTED_EVENT"
  | "CANVAS_RESIZED";

export interface CanvasRpcMessage<T = unknown> {
  id: string;
  type: CanvasRpcMessageType;
  payload: T;
}

/**
 * Preview iframe must use sandbox="allow-scripts" without allow-same-origin
 * on the platform origin. Host ↔ canvas communication is PostMessage-only.
 */
export const CANVAS_SANDBOX_ATTR = "allow-scripts" as const;
