import { createServerFn } from "@tanstack/react-start";
import { generateObject } from "ai";
import { z } from "zod";
import { createMistralProvider, formatAiGatewayError, mistralKeyRotator } from "@/lib/ai-gateway.server";
import type { RawNode } from "../semantic-intent/types";

// Recursive Zod schema for RawNode
const nodeTypeSchema = z.enum(["input", "button", "text", "box", "list"]);
const inputTypeSchema = z.enum(["text", "email", "password", "number"]).optional();
const actionTypeSchema = z.enum(["submit", "cancel", "navigate"]).optional();

export const rawNodeSchema: z.ZodType<RawNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: nodeTypeSchema,
    label: z.string().optional(),
    text: z.string().optional(),
    inputType: inputTypeSchema,
    name: z.string().optional(),
    action: actionTypeSchema,
    className: z.string().optional(),
    children: z.array(rawNodeSchema).optional(),
  }),
);

/**
 * Vision → RawNode AST via **Mistral Pixtral only**.
 * No mock / local AI fallback — missing key or API failure throws.
 */
export const parseVisionImage = createServerFn({ method: "POST" })
  .validator((data: { imageBase64: string }) => data)
  .handler(async ({ data }): Promise<{ node: RawNode; source: "mistral" }> => {
    if (mistralKeyRotator.keyCount === 0) {
      throw new Error(
        "Missing MISTRAL_API_KEY. Vision parsing requires Mistral Pixtral — no local/mock AI. Set MISTRAL_API_KEY (or MISTRAL_API_KEYS) in server env / Lovable Cloud Secrets (console.mistral.ai).",
      );
    }

    try {
      const { object: rawNode } = await mistralKeyRotator.executeWithRetry(async (apiKey) => {
        const mistral = createMistralProvider(apiKey);
        const model = mistral("pixtral-12b-2409");

        return await generateObject({
          model,
          schema: rawNodeSchema,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analyze this UI screenshot / mockup and extract its component hierarchy into a structured AST (RawNode tree). Identify containers (box), text elements (text), inputs (input with email/password/text inputType), buttons (button with submit/cancel action), and lists (list). Output accurate Tailwind CSS class names in className where appropriate for layout.",
                },
                {
                  type: "image",
                  image: data.imageBase64,
                },
              ],
            },
          ],
        });
      });

      return { node: rawNode, source: "mistral" };
    } catch (err) {
      console.error("[VisionModel] Mistral Vision API generation failed:", err);
      const msg = formatAiGatewayError(err);
      if (msg.includes("Missing MISTRAL_API_KEY") || (err instanceof Error && err.message.includes("Missing MISTRAL"))) {
        throw err instanceof Error ? err : new Error(msg);
      }
      throw new Error(`Mistral Vision failed: ${msg}`);
    }
  });
