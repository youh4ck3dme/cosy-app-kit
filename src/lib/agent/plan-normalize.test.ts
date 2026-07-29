import { describe, expect, it } from "vitest";
import {
  normalizePlanStepsInput,
  PLAN_GOAL_MAX,
  PLAN_STEP_MAX,
  PLAN_STEPS_MAX,
} from "./plan-normalize";

describe("normalizePlanStepsInput", () => {
  it("returns null for empty / invalid payloads", () => {
    expect(normalizePlanStepsInput(null)).toBeNull();
    expect(normalizePlanStepsInput({})).toBeNull();
    expect(normalizePlanStepsInput({ goal: "x", steps: [] })).toBeNull();
    expect(normalizePlanStepsInput({ goal: "", steps: ["a"] })).toBeNull();
  });

  it("clips overlong goal and steps instead of rejecting", () => {
    const longStep = "x".repeat(PLAN_STEP_MAX + 80);
    const steps = Array.from(
      { length: PLAN_STEPS_MAX + 4 },
      (_, i) => `Step ${i + 1}: ${longStep}`,
    );
    const out = normalizePlanStepsInput({
      goal: "G".repeat(PLAN_GOAL_MAX + 50),
      steps,
      risks: ["r".repeat(400), "ok risk"],
      open_questions: ["q".repeat(400)],
      persist: true,
    });
    expect(out).not.toBeNull();
    expect(out!.goal).toHaveLength(PLAN_GOAL_MAX);
    expect(out!.steps).toHaveLength(PLAN_STEPS_MAX);
    expect(out!.steps.every((s) => s.length <= PLAN_STEP_MAX)).toBe(true);
    expect(out!.risks[0]!.length).toBeLessThanOrEqual(300);
    expect(out!.persist).toBe(true);
  });

  it("drops non-string / blank entries", () => {
    const out = normalizePlanStepsInput({
      goal: " Ship BookSlot ",
      steps: ["ok", "  ", 42, null, "two"],
      risks: undefined,
      open_questions: "not-an-array",
    });
    expect(out).toEqual({
      goal: "Ship BookSlot",
      steps: ["ok", "two"],
      risks: [],
      open_questions: [],
      persist: false,
    });
  });
});
