/**
 * T14/T15 — repair-pass metering (server-only).
 * Prefers Supabase RPC consume_repair_pass; falls back to in-memory for tests/dev without admin.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { currentUsagePeriod, getUserPlan } from "@/lib/billing/plan.server";

export type ConsumeRepairResult =
  | { ok: true; used: number; limit: number; remaining: number; period: string }
  | {
      ok: false;
      reason: "quota_exceeded" | "unavailable";
      used: number;
      limit: number;
      remaining: number;
      period: string;
    };

/** In-memory counters for unit tests / missing service role. */
const memoryCounters = new Map<string, number>();

export function memoryCounterKey(userId: string, period = currentUsagePeriod()): string {
  return `${userId}:${period}`;
}

/** Test helper. */
export function resetMemoryRepairCounters(): void {
  memoryCounters.clear();
}

export function getMemoryRepairUsed(userId: string, period = currentUsagePeriod()): number {
  return memoryCounters.get(memoryCounterKey(userId, period)) ?? 0;
}

async function tryAdmin(): Promise<SupabaseClient<Database> | null> {
  if (!(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim()) return null;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return supabaseAdmin;
  } catch {
    return null;
  }
}

/**
 * Atomically consume one repair pass for the user's current monthly period.
 * Returns quotaExceeded when free/pro allowance is exhausted.
 */
export async function consumeRepairPass(
  userId: string,
  opts?: { admin?: SupabaseClient<Database> | null; useMemory?: boolean },
): Promise<ConsumeRepairResult> {
  const period = currentUsagePeriod();
  const plan = await getUserPlan(userId, opts?.admin);
  const limit = plan.repairPassesMonthly;

  const forceMemory = opts?.useMemory === true;
  const admin = forceMemory ? null : (opts?.admin === undefined ? await tryAdmin() : opts.admin);

  if (!admin) {
    const key = memoryCounterKey(userId, period);
    const used = memoryCounters.get(key) ?? 0;
    if (used >= limit) {
      return {
        ok: false,
        reason: "quota_exceeded",
        used,
        limit,
        remaining: 0,
        period,
      };
    }
    const next = used + 1;
    memoryCounters.set(key, next);
    return {
      ok: true,
      used: next,
      limit,
      remaining: Math.max(0, limit - next),
      period,
    };
  }

  try {
    const { data, error } = await admin.rpc("consume_repair_pass", {
      p_user_id: userId,
      p_period: period,
      p_limit: limit,
    });

    if (error) {
      console.error("[metering] consume_repair_pass rpc", error.message);
      // Fail open to memory for resilience in misconfigured envs (still enforces in-process)
      return consumeRepairPass(userId, { useMemory: true });
    }

    const allowed = data === true;
    const { data: row } = await admin
      .from("usage_counters")
      .select("repair_passes")
      .eq("user_id", userId)
      .eq("period", period)
      .maybeSingle();

    const used = row?.repair_passes ?? (allowed ? 1 : limit);
    if (!allowed) {
      return {
        ok: false,
        reason: "quota_exceeded",
        used,
        limit,
        remaining: 0,
        period,
      };
    }
    return {
      ok: true,
      used,
      limit,
      remaining: Math.max(0, limit - used),
      period,
    };
  } catch (e) {
    console.error("[metering] consume error", e);
    return consumeRepairPass(userId, { useMemory: true });
  }
}

export async function canConsumeRepairPass(userId: string): Promise<{
  ok: boolean;
  used: number;
  limit: number;
  remaining: number;
  period: string;
}> {
  const period = currentUsagePeriod();
  const plan = await getUserPlan(userId);
  const limit = plan.repairPassesMonthly;
  const admin = await tryAdmin();

  if (!admin) {
    const used = getMemoryRepairUsed(userId, period);
    return {
      ok: used < limit,
      used,
      limit,
      remaining: Math.max(0, limit - used),
      period,
    };
  }

  const { data: row } = await admin
    .from("usage_counters")
    .select("repair_passes")
    .eq("user_id", userId)
    .eq("period", period)
    .maybeSingle();
  const used = row?.repair_passes ?? 0;
  return {
    ok: used < limit,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    period,
  };
}

/**
 * T30 - Get current repair pass quota for display in UI (server-sourced).
 * Returns the quota information without consuming.
 */
export async function getRepairQuota(userId: string): Promise<{
  used: number;
  limit: number;
  remaining: number;
  period: string;
}> {
  return canConsumeRepairPass(userId);
}
