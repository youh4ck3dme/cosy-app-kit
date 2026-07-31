/**
 * T13 — getUserPlan: read subscriptions → free | pro + monthly repair allowance.
 * Server-only. Defaults free when service role missing or no active sub.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  PRO_PLAN_ID,
  repairPassesForPlan,
} from "@/lib/billing/repair-passes";

export type UserPlanInfo = {
  plan: "free" | "pro";
  repairPassesMonthly: number;
  status: string | null;
  currentPeriodEnd: string | null;
};

const planCache = new Map<string, { at: number; value: UserPlanInfo }>();
const CACHE_MS = 30_000;

function freePlan(): UserPlanInfo {
  return {
    plan: "free",
    repairPassesMonthly: repairPassesForPlan("free"),
    status: null,
    currentPeriodEnd: null,
  };
}

export function currentUsagePeriod(d = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Test helper: clear short-lived plan cache. */
export function clearUserPlanCache(): void {
  planCache.clear();
}

export async function getUserPlan(
  userId: string,
  admin?: SupabaseClient<Database> | null,
): Promise<UserPlanInfo> {
  if (!userId) return freePlan();

  const hit = planCache.get(userId);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;

  let client = admin;
  if (client === undefined) {
    try {
      if (!(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim()) {
        const v = freePlan();
        planCache.set(userId, { at: Date.now(), value: v });
        return v;
      }
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      client = supabaseAdmin;
    } catch {
      const v = freePlan();
      planCache.set(userId, { at: Date.now(), value: v });
      return v;
    }
  }
  if (!client) {
    const v = freePlan();
    planCache.set(userId, { at: Date.now(), value: v });
    return v;
  }

  try {
    const { data, error } = await client
      .from("subscriptions")
      .select("status,plan,repair_passes_monthly,current_period_end")
      .eq("user_id", userId)
      .in("status", ["active", "trialing"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      const v = freePlan();
      planCache.set(userId, { at: Date.now(), value: v });
      return v;
    }

    const end = data.current_period_end ? new Date(data.current_period_end) : null;
    if (end && end.getTime() < Date.now()) {
      const v = freePlan();
      planCache.set(userId, { at: Date.now(), value: v });
      return v;
    }

    const isPro =
      data.plan === "pro" ||
      data.plan === PRO_PLAN_ID ||
      (typeof data.repair_passes_monthly === "number" &&
        data.repair_passes_monthly >= repairPassesForPlan("pro"));

    const v: UserPlanInfo = {
      plan: isPro ? "pro" : "free",
      repairPassesMonthly:
        typeof data.repair_passes_monthly === "number" && data.repair_passes_monthly > 0
          ? data.repair_passes_monthly
          : repairPassesForPlan(isPro ? "pro" : "free"),
      status: data.status,
      currentPeriodEnd: data.current_period_end,
    };
    planCache.set(userId, { at: Date.now(), value: v });
    return v;
  } catch {
    const v = freePlan();
    planCache.set(userId, { at: Date.now(), value: v });
    return v;
  }
}
