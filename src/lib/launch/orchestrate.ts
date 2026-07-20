import { createMistralProvider } from "@/lib/ai-gateway.server";
import { generateBlueprint, type GenerateTextFn } from "./blueprint";
import { assembleFiles, type AssembledLaunch } from "./assemble";
import { generateAllPages } from "./pages";
import { generateSharedShell } from "./shell";
import type { LaunchBlueprint } from "./schema";

export type LaunchTimings = {
  blueprintMs: number;
  pagesMs: number;
  totalMs: number;
};

export type LaunchPipelineResult = {
  blueprint: LaunchBlueprint;
  assembled: AssembledLaunch;
  timings: LaunchTimings;
  pageFallbacks: string[];
};

export type RunLaunchOptions = {
  apiKey?: string;
  generateText?: GenerateTextFn;
};

function mistralGenerateText(apiKey: string): GenerateTextFn {
  return async ({ modelId, system, prompt, temperature, maxOutputTokens }) => {
    const { generateText } = await import("ai");
    const provider = createMistralProvider(apiKey);
    const result = await generateText({
      model: provider(modelId),
      system,
      prompt,
      temperature,
      maxOutputTokens,
    });
    return result.text ?? "";
  };
}

export async function runLaunchPipeline(
  brief: string,
  opts: RunLaunchOptions = {},
): Promise<LaunchPipelineResult> {
  const t0 = Date.now();
  const key =
    opts.apiKey?.trim() ||
    (process.env.MISTRAL_API_KEY ?? process.env.MISTRAL_KEY ?? "").trim();
  const generateText = opts.generateText ?? (key ? mistralGenerateText(key) : null);
  if (!generateText) {
    throw new Error("MISTRAL_API_KEY is required for launch_site pipeline");
  }

  const bpStart = Date.now();
  const blueprint = await generateBlueprint(brief, { generateText });
  const blueprintMs = Date.now() - bpStart;

  const shell = generateSharedShell(blueprint);

  const pagesStart = Date.now();
  const pageResults = await generateAllPages(blueprint, shell, { generateText });
  const pagesMs = Date.now() - pagesStart;

  const assembled = assembleFiles(
    blueprint,
    pageResults.map((p) => ({ pageId: p.pageId, html: p.html })),
  );

  return {
    blueprint,
    assembled,
    timings: {
      blueprintMs,
      pagesMs,
      totalMs: Date.now() - t0,
    },
    pageFallbacks: pageResults.filter((p) => p.fallback).map((p) => p.pageId),
  };
}
