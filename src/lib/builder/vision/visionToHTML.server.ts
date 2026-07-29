import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import {
  createMistralProvider,
  formatAiGatewayError,
  mistralKeyRotator,
} from "@/lib/ai-gateway.server";
import { HTMLAdapterEngine } from "../semantic-intent/HTMLAdapterEngine";
import { AISpatialContextEngine } from "../semantic-intent/spatialEngine";
import type { RawNode } from "../semantic-intent/types";

export interface VisionToHTMLInput {
  imageBase64: string;
  mimeType?: string;
}

export interface VisionToHTMLResult {
  nodes: RawNode[];
  rawHTML: string;
  source: "mistral";
}

const htmlAdapter = new HTMLAdapterEngine();
const spatialEngine = new AISpatialContextEngine();

/**
 * Enterprise Vision Image-to-HTML Server Function powered by Mistral Pixtral 12B.
 * Converts UI screenshots directly to responsive RawNode ASTs.
 */
export const convertVisionImageToHTML = createServerFn({ method: "POST" })
  .validator((data: VisionToHTMLInput) => data)
  .handler(async ({ data }): Promise<VisionToHTMLResult> => {
    if (mistralKeyRotator.keyCount === 0) {
      throw new Error(
        "Missing MISTRAL_API_KEY. Vision parsing requires Mistral Pixtral — no local/mock AI. Set MISTRAL_API_KEY in server env / Lovable Cloud Secrets.",
      );
    }

    try {
      const systemPrompt =
        "Analyse this UI screenshot/design image carefully. Recreate this layout with 99% visual fidelity using clean, semantic HTML5 tags (<header>, <nav>, <main>, <button>, <input>) and modern Tailwind CSS v3 utility classes (dark mode friendly, flexbox/grid, responsive). Return ONLY clean HTML code inside a ```html block without explanation.";

      const rawHTMLResponse = await mistralKeyRotator.executeWithRetry(async (apiKey) => {
        const mistral = createMistralProvider(apiKey);
        const model = mistral("pixtral-12b-2409");

        const { text } = await generateText({
          model,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: systemPrompt,
                },
                {
                  type: "image",
                  image: data.imageBase64,
                },
              ],
            },
          ],
        });

        return text;
      });

      // Extract HTML block
      const htmlBlockMatch = rawHTMLResponse.match(/```html\s*([\s\S]*?)\s*```/i);
      const cleanHTML = htmlBlockMatch ? htmlBlockMatch[1].trim() : rawHTMLResponse.trim();

      // 1. Parse HTML string to RawNode AST
      const initialAST = htmlAdapter.parseHTMLString(cleanHTML);

      // 2. Auto-fix mobile responsiveness via spatial engine
      const responsiveAST = spatialEngine.autoFixMobileResponsive(initialAST);

      return {
        nodes: responsiveAST,
        rawHTML: cleanHTML,
        source: "mistral",
      };
    } catch (err) {
      console.error("[VisionToHTML] Mistral Vision API execution failed:", err);
      const msg = formatAiGatewayError(err);
      throw new Error(`Mistral Vision HTML Generation failed: ${msg}`);
    }
  });
