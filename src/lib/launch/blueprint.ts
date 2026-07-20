import { DEFAULT_MODEL, SUGGESTION_MODEL } from "@/lib/models";
import {
  LaunchBlueprintSchema,
  normalizeBlueprintNav,
  type LaunchBlueprint,
} from "./schema";
import { BLUEPRINT_SYSTEM, buildBlueprintUserPrompt } from "./prompts";

export type GenerateTextFn = (args: {
  modelId: string;
  system: string;
  prompt: string;
  temperature: number;
  maxOutputTokens: number;
}) => Promise<string>;

export class BlueprintError extends Error {
  constructor(
    message: string,
    public readonly causeDetail?: string,
  ) {
    super(message);
    this.name = "BlueprintError";
  }
}

/** Strip optional markdown fences around JSON. */
export function extractJsonText(raw: string): string {
  const t = raw.trim();
  const fenced = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i.exec(t);
  if (fenced?.[1]) return fenced[1].trim();
  // Model sometimes adds prose before JSON
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) return t.slice(start, end + 1);
  return t;
}

export function parseBlueprintJson(raw: string): LaunchBlueprint {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonText(raw));
  } catch (e) {
    throw new BlueprintError("Blueprint JSON parse failed", (e as Error).message);
  }
  const result = LaunchBlueprintSchema.safeParse(parsed);
  if (!result.success) {
    throw new BlueprintError(
      "Blueprint schema validation failed",
      result.error.issues
        .slice(0, 6)
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; "),
    );
  }
  return normalizeBlueprintNav(result.data);
}

export async function generateBlueprint(
  brief: string,
  opts: { generateText: GenerateTextFn },
): Promise<LaunchBlueprint> {
  const user = buildBlueprintUserPrompt(brief);
  const tryModel = async (modelId: string) => {
    const text = await opts.generateText({
      modelId,
      system: BLUEPRINT_SYSTEM,
      prompt: user,
      temperature: 0.3,
      maxOutputTokens: 2500,
    });
    return parseBlueprintJson(text);
  };

  try {
    return await tryModel(SUGGESTION_MODEL);
  } catch (first) {
    try {
      return await tryModel(DEFAULT_MODEL);
    } catch (second) {
      const detail =
        second instanceof BlueprintError
          ? second.causeDetail || second.message
          : (second as Error).message;
      const firstMsg =
        first instanceof BlueprintError
          ? first.causeDetail || first.message
          : (first as Error).message;
      throw new BlueprintError(
        `Failed to generate launch blueprint after Small + Large`,
        `small: ${firstMsg}; large: ${detail}`,
      );
    }
  }
}
