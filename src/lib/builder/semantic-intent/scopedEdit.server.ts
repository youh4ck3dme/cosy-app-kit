import { createServerFn } from "@tanstack/react-start";
import { generateObject } from "ai";
import { z } from "zod";
import {
  createMistralProvider,
  formatAiGatewayError,
  mistralKeyRotator,
} from "@/lib/ai-gateway.server";
import type { RawNode } from "./types";

const nodeTypeSchema = z.enum(["input", "button", "text", "box", "list"]);
const inputTypeSchema = z.enum(["text", "email", "password", "number"]).optional();
const actionTypeSchema = z.enum(["submit", "cancel", "navigate"]).optional();

const rawNodeUpdateSchema = z.object({
  id: z.string(),
  type: nodeTypeSchema,
  label: z.string().optional(),
  text: z.string().optional(),
  inputType: inputTypeSchema,
  name: z.string().optional(),
  action: actionTypeSchema,
  className: z.string().optional(),
});

/**
 * Scoped LLM edit via **Mistral only** (no local / heuristic / mock AI).
 * Only the target node JSON is sent — not the full AST.
 */
export const applyScopedNodeEdit = createServerFn({ method: "POST" })
  .validator(
    (data: {
      targetNode: RawNode;
      minimalPromptContext: string;
      userPrompt: string;
    }) => data,
  )
  .handler(async ({ data }): Promise<{ node: RawNode; source: "mistral" }> => {
    if (mistralKeyRotator.keyCount === 0) {
      throw new Error(
        "Missing MISTRAL_API_KEY. Scoped edits require Mistral — no local AI. Set MISTRAL_API_KEY (or MISTRAL_API_KEYS) in server env / Lovable Cloud Secrets.",
      );
    }

    try {
      const { object } = await mistralKeyRotator.executeWithRetry(async (apiKey) => {
        const mistral = createMistralProvider(apiKey);
        const model = mistral("mistral-small-latest");

        return await generateObject({
          model,
          schema: rawNodeUpdateSchema,
          messages: [
            {
              role: "system",
              content:
                "You edit a single UI AST node. Return the full updated node JSON. Prefer Tailwind className changes. Keep the same id and type. Do not invent unrelated fields. Respond only with the schema object.",
            },
            {
              role: "user",
              content: [
                "Scoped node context (JSON):",
                data.minimalPromptContext,
                "",
                "Current full target node:",
                JSON.stringify(data.targetNode),
                "",
                "User edit request:",
                data.userPrompt,
              ].join("\n"),
            },
          ],
        });
      });

      return {
        node: {
          ...data.targetNode,
          ...object,
          id: data.targetNode.id,
          type: data.targetNode.type,
          children: data.targetNode.children,
        },
        source: "mistral",
      };
    } catch (error) {
      console.error("[ScopedEdit] Mistral error:", error);
      const message = formatAiGatewayError(error);
      if (
        message.includes("Missing MISTRAL_API_KEY") ||
        (error instanceof Error && error.message.includes("Missing MISTRAL"))
      ) {
        throw error instanceof Error ? error : new Error(message);
      }
      throw new Error(
        `Mistral scoped edit failed: ${message.slice(0, 240)}. Check MISTRAL_API_KEY and console.mistral.ai.`,
      );
    }
  });
