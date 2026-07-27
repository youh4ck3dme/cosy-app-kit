import { createServerFn } from "@tanstack/react-start";
import { generateObject } from "ai";
import { z } from "zod";
import { createMistralProvider } from "@/lib/ai-gateway.server";
import type { RawNode } from "./types";
import { applyScopedPromptHeuristic } from "./scopedEdit";

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
 * Scoped LLM edit: only the target node JSON is sent — not the full AST.
 * Falls back to deterministic heuristics when Mistral is unavailable.
 */
export const applyScopedNodeEdit = createServerFn({ method: "POST" })
  .validator(
    (data: {
      targetNode: RawNode;
      minimalPromptContext: string;
      userPrompt: string;
    }) => data,
  )
  .handler(
    async ({
      data,
    }): Promise<{ node: RawNode; source: "mistral" | "heuristic" }> => {
      const mistralKey = (process.env.MISTRAL_API_KEY ?? process.env.MISTRAL_KEY ?? "").trim();

      if (!mistralKey) {
        const node = applyScopedPromptHeuristic(data.targetNode, data.userPrompt);
        return { node, source: "heuristic" };
      }

      try {
        const mistral = createMistralProvider(mistralKey);
        const model = mistral("mistral-small-latest");

        const result = await generateObject({
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

        return {
          node: {
            ...data.targetNode,
            ...result.object,
            id: data.targetNode.id,
            type: data.targetNode.type,
            children: data.targetNode.children,
          },
          source: "mistral",
        };
      } catch (error) {
        console.error("[ScopedEdit] Mistral error, falling back to heuristic:", error);
        const node = applyScopedPromptHeuristic(data.targetNode, data.userPrompt);
        return { node, source: "heuristic" };
      }
    },
  );
