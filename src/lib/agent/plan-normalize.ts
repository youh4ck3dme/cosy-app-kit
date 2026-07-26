/** Caps for plan_steps tool — keep bullets short; long narrative stays in chat text. */
export const PLAN_GOAL_MAX = 400;
export const PLAN_STEP_MAX = 300;
export const PLAN_STEPS_MAX = 8;
export const PLAN_RISK_MAX = 300;
export const PLAN_RISKS_MAX = 6;
export const PLAN_QUESTION_MAX = 300;
export const PLAN_QUESTIONS_MAX = 6;

function clipList(raw: unknown, itemMax: number, listMax: number): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const clipped = item.trim().slice(0, itemMax);
    if (!clipped) continue;
    out.push(clipped);
    if (out.length >= listMax) break;
  }
  return out;
}

export type NormalizedPlanSteps = {
  goal: string;
  steps: string[];
  risks: string[];
  open_questions: string[];
  persist: boolean;
};

/**
 * Coerce + truncate model tool args so Zod/schema limits don't surface as
 * generic "An error occurred" when the model writes long plan bullets.
 */
export function normalizePlanStepsInput(raw: unknown): NormalizedPlanSteps | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const goal = typeof o.goal === "string" ? o.goal.trim().slice(0, PLAN_GOAL_MAX) : "";
  const steps = clipList(o.steps, PLAN_STEP_MAX, PLAN_STEPS_MAX);
  if (!goal || steps.length === 0) return null;
  return {
    goal,
    steps,
    risks: clipList(o.risks, PLAN_RISK_MAX, PLAN_RISKS_MAX),
    open_questions: clipList(o.open_questions, PLAN_QUESTION_MAX, PLAN_QUESTIONS_MAX),
    persist: o.persist === true,
  };
}
