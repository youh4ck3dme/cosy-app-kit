import { createServerFn } from "@tanstack/react-start";
import { generateObject } from "ai";
import { z } from "zod";
import { createMistralProvider } from "@/lib/ai-gateway.server";
import { parseImageToRawNode as parseMockImage } from "./mockVisionModel";
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

export const parseVisionImage = createServerFn({ method: "POST" })
  .validator((data: { imageBase64: string }) => data)
  .handler(async ({ data }): Promise<{ node: RawNode; source: "mistral" | "mock" }> => {
    const mistralKey = (process.env.MISTRAL_API_KEY ?? process.env.MISTRAL_KEY ?? "").trim();

    if (!mistralKey) {
      console.warn("[VisionModel] MISTRAL_API_KEY is not set. Falling back to mock model.");
      const mockNode = await parseMockImage(data.imageBase64);
      return { node: mockNode, source: "mock" };
    }

    try {
      const mistral = createMistralProvider(mistralKey);
      // Use pixtral-12b-2409 for Vision processing
      const model = mistral("pixtral-12b-2409");

      const result = await generateObject({
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

      return { node: result.object, source: "mistral" };
    } catch (error) {
      console.error("[VisionModel] Mistral Pixtral Vision error:", error);
      const mockNode = await parseMockImage(data.imageBase64);
      return { node: mockNode, source: "mock" };
    }
  });
