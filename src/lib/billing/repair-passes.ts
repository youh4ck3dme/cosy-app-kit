/**
 * Artifact Insurance — COSY Pro maps to monthly auto-repair pass allowance
 * (not seat count). Soft product constant; enforce when metering ships.
 */
export const FREE_REPAIR_PASSES_MONTHLY = 5;
/** PRO price → repair-pass quota (Artifact Insurance wedge). */
export const PRO_REPAIR_PASSES_MONTHLY = 100;
export const PRO_PLAN_ID = "cosy_pro" as const;
export const PRO_PLAN_LABEL = "COSY Pro";

export function repairPassesForPlan(plan: "free" | "pro" | string | null | undefined): number {
  if (plan === "pro" || plan === PRO_PLAN_ID) return PRO_REPAIR_PASSES_MONTHLY;
  return FREE_REPAIR_PASSES_MONTHLY;
}
