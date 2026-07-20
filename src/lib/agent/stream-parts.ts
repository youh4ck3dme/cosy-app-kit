/**
 * Stream data-part contract for Cursor UI (G1.3).
 * Server writes chunks with type `data-${name}`; client listens via useChat onData
 * or message parts with type `data-*`.
 */

import type { ToolResultLike } from "@/lib/agent/finish";

export type ArtifactCreatedData = {
  artifactId: string;
  title: string;
  kind?: string;
};

export type MemorySavedData = {
  key: string;
  previous?: string | null;
};

export type PlanData = {
  goal: string;
  steps: string[];
  risks?: string[];
  open_questions?: string[];
};

export type BuilderDataPart =
  | { type: "data-artifact-created"; data: ArtifactCreatedData; transient?: boolean }
  | { type: "data-memory-saved"; data: MemorySavedData; transient?: boolean }
  | { type: "data-plan"; data: PlanData; transient?: boolean };

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object") return null;
  return v as Record<string, unknown>;
}

/** Map a single tool result to zero or more UI data parts (transient toasts). */
export function toolResultToDataParts(result: ToolResultLike): BuilderDataPart[] {
  const name = result.toolName;
  const out = asRecord(result.output);
  if (!name || !out || out.ok !== true) return [];

  if (
    (name === "create_artifact" || name === "launch_site") &&
    typeof out.artifactId === "string"
  ) {
    return [
      {
        type: "data-artifact-created",
        data: {
          artifactId: out.artifactId,
          title: typeof out.title === "string" ? out.title : "Artifact",
          kind: typeof out.kind === "string" ? out.kind : undefined,
        },
        transient: true,
      },
    ];
  }

  if (name === "remember" && typeof out.key === "string") {
    return [
      {
        type: "data-memory-saved",
        data: {
          key: out.key,
          previous: typeof out.previous === "string" ? out.previous : null,
        },
        transient: true,
      },
    ];
  }

  if (name === "plan_steps") {
    const plan = asRecord(out.plan) ?? out;
    const goal = typeof plan.goal === "string" ? plan.goal : "";
    const steps = Array.isArray(plan.steps)
      ? plan.steps.filter((s): s is string => typeof s === "string")
      : [];
    if (goal || steps.length) {
      return [
        {
          type: "data-plan",
          data: {
            goal,
            steps,
            risks: Array.isArray(plan.risks)
              ? plan.risks.filter((s): s is string => typeof s === "string")
              : undefined,
            open_questions: Array.isArray(plan.open_questions)
              ? plan.open_questions.filter((s): s is string => typeof s === "string")
              : undefined,
          },
          transient: true,
        },
      ];
    }
  }

  return [];
}

export function toolResultsToDataParts(results: ToolResultLike[]): BuilderDataPart[] {
  return results.flatMap(toolResultToDataParts);
}
