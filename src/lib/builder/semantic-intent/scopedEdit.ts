import type { RawNode } from "./types";
import { AISpatialContextEngine, type ScopedContextResult } from "./spatialEngine";

export interface ScopedEditPipelineResult {
  updatedAST: RawNode[];
  updatedNode: RawNode;
  scoped: ScopedContextResult;
  /** Production path is always Mistral; `"test"` exists only in unit tests. */
  source: "mistral" | "test";
}

/**
 * Deterministic class/text rewrites for **unit tests only**.
 * Production scoped edits must go through Mistral (`applyScopedNodeEdit`).
 * Not a local AI model — pure string rules for offline pipeline tests.
 */
export function applyScopedPromptHeuristic(target: RawNode, userPrompt: string): RawNode {
  // Keep original for text renames; lowercased for keyword matching
  const original = userPrompt.trim();
  const prompt = original.toLowerCase();
  let className = target.className || "";
  let text = target.text;
  let label = target.label;

  // Avoid \b — JS word boundaries break on Slovak diacritics (č, ž, …)
  const colorRules: Array<{ match: RegExp; classes: string }> = [
    {
      match: /red|červen|cerveny|cervena|cervene|červené/i,
      classes: "bg-red-500 hover:bg-red-600 text-white border-red-600",
    },
    {
      match: /blue|modr|tmavomod|navy/i,
      classes: "bg-blue-700 hover:bg-blue-800 text-white border-blue-800",
    },
    {
      match: /green|zelen/i,
      classes: "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600",
    },
    {
      match: /purple|fialov/i,
      classes: "bg-purple-500 hover:bg-purple-600 text-white border-purple-600",
    },
    {
      match: /black|ciern|čiern/i,
      classes: "bg-gray-900 hover:bg-black text-white border-gray-900",
    },
    {
      match: /white|biel/i,
      classes: "bg-white hover:bg-gray-50 text-gray-900 border border-gray-200",
    },
  ];

  for (const rule of colorRules) {
    if (rule.match.test(prompt)) {
      className = stripColorTokens(className);
      className = `${className} ${rule.classes}`.trim();
      break;
    }
  }

  const textMatch =
    original.match(/(?:text|label|nadpis)\s*(?:to|na|=)\s*["']?(.+?)["']?\s*$/i) ||
    original.match(/(?:rename|premenuj)\s+(?:to|na)\s+["']?(.+?)["']?\s*$/i);
  if (textMatch?.[1]) {
    const next = textMatch[1].trim();
    if (target.type === "input") {
      label = next;
    } else {
      text = next;
    }
  }

  if (/bold|tučn|tucn|strong/i.test(prompt) && !/\bfont-bold\b/.test(className)) {
    className = `${className} font-bold`.trim();
  }

  if (/larger|bigger|väčš|vacsi|bigger text/i.test(prompt)) {
    className = className.replace(/\btext-(xs|sm|base|lg|xl|2xl)\b/g, "").trim();
    className = `${className} text-xl`.trim();
  }

  return {
    ...target,
    className: normalizeClasses(className),
    text,
    label,
  };
}

/**
 * Full pipeline: scoped extract → node edit → delta apply.
 * Production must inject Mistral `editNode` (builder.tsx + applyScopedNodeEdit).
 * Unit tests may inject a deterministic editor; there is no default local AI.
 */
export async function runScopedEditPipeline(options: {
  fullAST: RawNode[];
  targetNodeId: string;
  userPrompt: string;
  /** Required — Mistral server fn in production; stub in tests. */
  editNode: (scoped: ScopedContextResult, userPrompt: string) => RawNode | Promise<RawNode>;
  source?: ScopedEditPipelineResult["source"];
}): Promise<ScopedEditPipelineResult | null> {
  const spatial = new AISpatialContextEngine();
  const scoped = spatial.extractScopedContext(options.targetNodeId, options.fullAST);
  if (!scoped) return null;

  const updatedNode = await options.editNode(scoped, options.userPrompt);
  const safeNode: RawNode = {
    ...updatedNode,
    id: scoped.targetNode.id,
    type: updatedNode.type || scoped.targetNode.type,
  };

  const updatedAST = spatial.applyASTDelta(options.fullAST, safeNode);

  return {
    updatedAST,
    updatedNode: safeNode,
    scoped,
    source: options.source ?? "mistral",
  };
}

function stripColorTokens(className: string): string {
  return className
    .split(/\s+/)
    .filter((token) => {
      if (!token) return false;
      if (/^bg-/.test(token)) return false;
      if (/^hover:bg-/.test(token)) return false;
      if (
        /^text-(white|black|gray|slate|red|blue|emerald|purple|indigo|rose|amber|green)-/.test(
          token,
        )
      )
        return false;
      if (/^border-(red|blue|emerald|purple|gray|slate|black)-/.test(token)) return false;
      return true;
    })
    .join(" ");
}

function normalizeClasses(className: string): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const token of className.trim().split(/\s+/).filter(Boolean)) {
    if (seen.has(token)) continue;
    seen.add(token);
    out.push(token);
  }
  return out.join(" ");
}
