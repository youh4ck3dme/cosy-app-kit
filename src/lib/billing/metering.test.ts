import { afterEach, describe, expect, it } from "vitest";
import {
  FREE_REPAIR_PASSES_MONTHLY,
  PRO_REPAIR_PASSES_MONTHLY,
} from "@/lib/billing/repair-passes";
import {
  clearUserPlanCache,
  currentUsagePeriod,
  getUserPlan,
} from "@/lib/billing/plan.server";
import {
  consumeRepairPass,
  getMemoryRepairUsed,
  resetMemoryRepairCounters,
} from "@/lib/billing/metering.server";

describe("plan.server getUserPlan", () => {
  afterEach(() => {
    clearUserPlanCache();
  });

  it("defaults free without admin/service role", async () => {
    const prev = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    try {
      const p = await getUserPlan("00000000-0000-0000-0000-000000000001", null);
      expect(p.plan).toBe("free");
      expect(p.repairPassesMonthly).toBe(FREE_REPAIR_PASSES_MONTHLY);
    } finally {
      if (prev !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = prev;
    }
  });

  it("currentUsagePeriod is YYYY-MM", () => {
    expect(currentUsagePeriod(new Date("2026-07-15T12:00:00Z"))).toBe("2026-07");
  });
});

describe("metering.server consumeRepairPass (memory)", () => {
  afterEach(() => {
    resetMemoryRepairCounters();
    clearUserPlanCache();
  });

  it("allows free limit then denies 6th pass", async () => {
    const userId = "11111111-1111-1111-1111-111111111111";
    for (let i = 1; i <= FREE_REPAIR_PASSES_MONTHLY; i++) {
      const r = await consumeRepairPass(userId, { useMemory: true, admin: null });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.used).toBe(i);
    }
    const denied = await consumeRepairPass(userId, { useMemory: true, admin: null });
    expect(denied.ok).toBe(false);
    if (!denied.ok) {
      expect(denied.reason).toBe("quota_exceeded");
      expect(denied.limit).toBe(FREE_REPAIR_PASSES_MONTHLY);
      expect(denied.used).toBe(FREE_REPAIR_PASSES_MONTHLY);
    }
    expect(getMemoryRepairUsed(userId)).toBe(FREE_REPAIR_PASSES_MONTHLY);
  });

  it("pro limit constant is 100", () => {
    expect(PRO_REPAIR_PASSES_MONTHLY).toBe(100);
  });
});
