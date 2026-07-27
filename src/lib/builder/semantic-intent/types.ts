import { z } from "zod";

export type NodeType = "input" | "button" | "text" | "box" | "list";
export type InputType = "text" | "email" | "password" | "number";
export type ActionType = "submit" | "cancel" | "navigate";
export type IntentType = "FormIntent" | "NavigationIntent" | "StaticIntent";

export interface RawNode {
  id: string;
  type: NodeType;
  label?: string;
  text?: string;
  inputType?: InputType;
  name?: string;
  action?: ActionType;
  children?: RawNode[];
  className?: string;
  meta?: Record<string, unknown>;
}

export interface SmartNode extends RawNode {
  stateKey?: string;
  isInteractive?: boolean;
  eventHandlers?: {
    onChange?: boolean;
    onClick?: boolean;
    onSubmit?: boolean;
  };
}

export interface EngineResult {
  componentName: string;
  code: string;
  intent: IntentType;
  css?: string;
}

export const RawNodeSchema: z.ZodType<RawNode> = z.lazy(
  () =>
    z.object({
      id: z.string(),
      type: z.enum(["input", "button", "text", "box", "list"]),
      label: z.string().optional(),
      text: z.string().optional(),
      inputType: z.enum(["text", "email", "password", "number"]).optional(),
      action: z.enum(["submit", "cancel", "navigate"]).optional(),
      className: z.string().optional(),
      children: z.array(RawNodeSchema).optional(),
      meta: z.record(z.string(), z.unknown()).optional(),
    }) as z.ZodType<RawNode>,
);

export class ASTAutoHealer {
  /**
   * Sanitizes and auto-heals corrupted AST data without crashing the application.
   */
  public static sanitizeAndHeal(data: unknown): RawNode[] {
    if (!Array.isArray(data)) {
      console.warn(
        "[ASTHealer] Expected array of nodes, received invalid payload. Healing to empty root.",
      );
      return [];
    }

    return data.map((item) => {
      const parsed = RawNodeSchema.safeParse(item);
      if (parsed.success) {
        return parsed.data;
      }
      console.warn("[ASTHealer] Corrupted node detected and auto-healed:", parsed.error.format());
      return {
        id: `healed_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        type: "box",
        className: "p-4 border border-red-500/50 bg-red-500/10 rounded",
        text: "Auto-Healed Corrupted Component",
        children: [],
        meta: { healingApplied: true, originalError: parsed.error.issues },
      };
    });
  }
}

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  absoluteBoundingBox?: { x: number; y: number; width: number; height: number };
  fills?: Array<{
    type: string;
    visible?: boolean;
    opacity?: number;
    color?: { r: number; g: number; b: number; a: number };
  }>;
  characters?: string;
  style?: Record<string, unknown>;
  layoutMode?: "HORIZONTAL" | "VERTICAL" | "NONE";
  itemSpacing?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  cornerRadius?: number;
}

export type SandboxRPCMessage =
  | { type: "SANDBOX_READY" }
  | { type: "RENDER_CODE"; code: string; css?: string; timeoutMs?: number }
  | { type: "RENDER_SUCCESS" }
  | { type: "RUNTIME_ERROR"; error: { message: string; stack?: string } }
  | { type: "EXECUTION_TIMEOUT"; timeoutMs: number }
  | { type: "CANVAS_RESIZED"; height: number; width: number };

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  author: string;
  entry: string;
  permissions: Array<"read_document" | "write_document" | "network_request">;
}

export interface ExportOptions {
  componentName: string;
  code: string;
  framework: "vite" | "nextjs";
}
