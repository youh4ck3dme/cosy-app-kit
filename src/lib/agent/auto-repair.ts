import type { ArtifactFile } from "@/lib/agent/artifacts";
import {
  ARTIFACT_AUTO_REPAIR_SYSTEM,
  MAX_ARTIFACT_REPAIR_PASSES,
  buildArtifactAutoRepairUser,
} from "@/lib/agent/prompts";
import { analyzeProjectRuntime, type ProjectRuntimeReport } from "@/lib/agent/project-runtime-gate";
import { applyRewrite, applySearchReplace, sanitizeRelativePath } from "@/lib/agent/patch";
import { BUILD_CODE_MODEL } from "@/lib/models";
import { consumeRepairPass } from "@/lib/billing/metering.server";

export { MAX_ARTIFACT_REPAIR_PASSES };

export type RepairGenerateFn = (args: {
  modelId: string;
  system: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
}) => Promise<string>;

export type AutoRepairMeta = {
  autoRepaired: boolean;
  repairPasses: number;
  /** True when at least one LLM/deterministic pass ran (even if still failing). */
  repairAttempted: boolean;
  /** True when repair was skipped due to quota exceeded. */
  quotaExceeded?: boolean;
  /** Quota metadata when quota check was performed. */
  quotaMeta?: {
    used: number;
    limit: number;
    remaining: number;
    period: string;
  } | null;
};

export type AutoRepairResult = {
  files: ArtifactFile[];
  quality: ProjectRuntimeReport;
} & AutoRepairMeta;

type PatchJson = {
  path: string;
  mode?: "rewrite" | "search_replace";
  content?: string;
  search?: string;
  replace?: string;
  replace_all?: boolean;
};

function stripJsonFence(raw: string): string {
  const t = raw.trim();
  const fenced = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i.exec(t);
  if (fenced?.[1]) return fenced[1].trim();
  return t;
}

export function parseRepairPatchesJson(raw: string): PatchJson[] {
  const text = stripJsonFence(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Try to salvage first {...} block
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end <= start) return [];
    try {
      parsed = JSON.parse(text.slice(start, end + 1));
    } catch {
      return [];
    }
  }
  if (!parsed || typeof parsed !== "object") return [];
  const patches = (parsed as { patches?: unknown }).patches;
  if (!Array.isArray(patches)) return [];
  const out: PatchJson[] = [];
  for (const p of patches.slice(0, 6)) {
    if (!p || typeof p !== "object") continue;
    const o = p as Record<string, unknown>;
    if (typeof o.path !== "string") continue;
    out.push({
      path: o.path,
      mode: o.mode === "rewrite" ? "rewrite" : "search_replace",
      content: typeof o.content === "string" ? o.content : undefined,
      search: typeof o.search === "string" ? o.search : undefined,
      replace: typeof o.replace === "string" ? o.replace : undefined,
      replace_all: o.replace_all === true,
    });
  }
  return out;
}

/** Cheap deterministic fixes before/ besides LLM (safe, idempotent). */
export function applyDeterministicProjectRepairs(files: ArtifactFile[]): ArtifactFile[] {
  return files.map((f) => {
    let content = f.content;
    const orig = content;
    if (/\.html?$/i.test(f.path)) {
      content = content.replace(/\s*user-scalable\s*=\s*no/gi, "");
      content = content.replace(/\s*,?\s*maximum-scale\s*=\s*1(\.0)?/gi, "");
    }
    if (/\.(m?js|html?)$/i.test(f.path)) {
      // Neutralize alert() without breaking call-site parentheses
      content = content.replace(/\balert\s*\(/g, "void(/*auto-repair*/");
    }
    if (content === orig) return f;
    return { ...f, content };
  });
}

function applyPatches(files: ArtifactFile[], patches: PatchJson[]): ArtifactFile[] {
  const next = files.map((f) => ({ ...f }));
  for (const patch of patches) {
    const pathOk = sanitizeRelativePath(patch.path);
    if (!pathOk.ok) continue;
    const idx = next.findIndex((f) => f.path === pathOk.path);
    if (idx < 0) continue;
    const prev = next[idx]!.content;
    if (patch.mode === "rewrite") {
      if (patch.content == null) continue;
      const rew = applyRewrite(patch.content);
      if (!rew.ok) continue;
      next[idx] = { ...next[idx]!, content: rew.content };
    } else {
      const result = applySearchReplace({
        content: prev,
        search: patch.search ?? "",
        replace: patch.replace,
        replace_all: patch.replace_all,
      });
      if (!result.ok) continue;
      next[idx] = { ...next[idx]!, content: result.content };
    }
  }
  return next;
}

function defaultMistralRepairGenerate(): RepairGenerateFn | null {
  const key = (process.env.MISTRAL_API_KEY ?? process.env.MISTRAL_KEY ?? "").trim();
  if (!key) return null;
  return async ({ modelId, system, prompt, temperature, maxOutputTokens }) => {
    const { generateText } = await import("ai");
    const { createMistralProvider } = await import("@/lib/ai-gateway.server");
    const provider = createMistralProvider(key);
    const result = await generateText({
      model: provider(modelId),
      system,
      prompt,
      temperature: temperature ?? 0.2,
      maxOutputTokens: maxOutputTokens ?? 6000,
    });
    return result.text ?? "";
  };
}

/**
 * After create_artifact / edit_file: if hardFails remain, run up to maxPasses
 * of deterministic + LLM patch repairs, re-scoring each pass.
 */
export async function maybeAutoRepairProjectFiles(
  files: ArtifactFile[],
  quality: ProjectRuntimeReport,
  opts: {
    generateText?: RepairGenerateFn | null;
    maxPasses?: number;
    /** Skip LLM when false (tests / plan). Default true when key or inject present. */
    enableLlm?: boolean;
    /** User ID for repair pass metering. If provided, consumes a pass before repair. */
    userId?: string;
  } = {},
): Promise<AutoRepairResult> {
  const maxPasses = opts.maxPasses ?? MAX_ARTIFACT_REPAIR_PASSES;
  if (quality.ok || quality.hardFails.length === 0) {
    return {
      files,
      quality,
      autoRepaired: false,
      repairPasses: 0,
      repairAttempted: false,
    };
  }

  // H2: Consume repair pass before starting repair
  if (opts.userId) {
    const debit = await consumeRepairPass(opts.userId);
    if (!debit.ok) {
      // Return early with quota exceeded state
      return {
        files,
        quality,
        autoRepaired: false,
        repairPasses: 0,
        repairAttempted: false,
        quotaExceeded: true,
        quotaMeta: {
          used: debit.used,
          limit: debit.limit,
          remaining: debit.remaining,
          period: debit.period,
        },
      };
    }
  }

  // Single-file HTML often has no project hardFails from multi-page gate — still allow
  // deterministic HTML sanitation when report failed.
  let current = files;
  let report = quality;
  let passes = 0;
  let changed = false;
  const enableLlm = opts.enableLlm !== false;
  const generateText =
    opts.generateText === null
      ? null
      : (opts.generateText ?? (enableLlm ? defaultMistralRepairGenerate() : null));

  while (passes < maxPasses && !report.ok && report.hardFails.length > 0) {
    passes += 1;
    const before = current;

    // Pass always starts with deterministic sanitation
    current = applyDeterministicProjectRepairs(current);

    if (generateText) {
      try {
        const raw = await generateText({
          modelId: BUILD_CODE_MODEL,
          system: ARTIFACT_AUTO_REPAIR_SYSTEM,
          prompt: buildArtifactAutoRepairUser({
            hardFails: report.hardFails,
            softFails: report.softFails,
            files: current,
            pass: passes,
            maxPasses,
          }),
          temperature: 0.2,
          maxOutputTokens: 6000,
        });
        const patches = parseRepairPatchesJson(raw);
        if (patches.length) {
          current = applyPatches(current, patches);
        }
      } catch {
        // Keep deterministic result; do not fail the tool
      }
    }

    const same =
      current.length === before.length &&
      current.every((f, i) => f.path === before[i]?.path && f.content === before[i]?.content);
    if (!same) changed = true;

    report = analyzeProjectRuntime(current);
    if (same && !generateText) break;
    if (same && generateText) {
      // LLM returned nothing useful — stop to avoid burn
      break;
    }
  }

  const hints = [...report.hints];
  if (passes > 0) {
    hints.unshift(
      changed ? `autoRepaired:true passes=${passes}` : `autoRepaired:attempted passes=${passes}`,
    );
  }

  return {
    files: current,
    quality: { ...report, hints: hints.slice(0, 8) },
    autoRepaired: changed,
    repairPasses: passes,
    repairAttempted: passes > 0,
  };
}
