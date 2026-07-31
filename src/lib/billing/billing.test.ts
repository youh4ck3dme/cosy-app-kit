import { describe, expect, it, vi } from "vitest";
import {
  FREE_REPAIR_PASSES_MONTHLY,
  PRO_REPAIR_PASSES_MONTHLY,
  repairPassesForPlan,
} from "@/lib/billing/repair-passes";
import { readStripeEnvStatus } from "@/lib/billing/stripe-env.server";
import { getBillingStatus } from "@/lib/billing/billing-status.server";

describe("repair-passes (Artifact Insurance)", () => {
  it("maps free vs pro quotas", () => {
    expect(FREE_REPAIR_PASSES_MONTHLY).toBe(5);
    expect(PRO_REPAIR_PASSES_MONTHLY).toBe(100);
    expect(repairPassesForPlan("free")).toBe(5);
    expect(repairPassesForPlan("pro")).toBe(100);
    expect(repairPassesForPlan("cosy_pro")).toBe(100);
    expect(repairPassesForPlan(null)).toBe(5);
  });
});

describe("stripe-env fail-closed", () => {
  it("reports missing keys without throwing", () => {
    const prev = {
      secret: process.env.STRIPE_SECRET_KEY,
      wh: process.env.STRIPE_WEBHOOK_SECRET,
      price: process.env.STRIPE_PRICE_PRO,
    };
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_PRICE_PRO;
    try {
      const s = readStripeEnvStatus();
      expect(s.configured).toBe(false);
      expect(s.missing).toContain("STRIPE_SECRET_KEY");
      expect(s.missing).toContain("STRIPE_WEBHOOK_SECRET");
      expect(s.missing).toContain("STRIPE_PRICE_PRO");
    } finally {
      if (prev.secret !== undefined) process.env.STRIPE_SECRET_KEY = prev.secret;
      else delete process.env.STRIPE_SECRET_KEY;
      if (prev.wh !== undefined) process.env.STRIPE_WEBHOOK_SECRET = prev.wh;
      else delete process.env.STRIPE_WEBHOOK_SECRET;
      if (prev.price !== undefined) process.env.STRIPE_PRICE_PRO = prev.price;
      else delete process.env.STRIPE_PRICE_PRO;
    }
  });
});

describe("billing-status", () => {
  it("returns live=false when Stripe env vars are missing", () => {
    const prev = {
      secret: process.env.STRIPE_SECRET_KEY,
      wh: process.env.STRIPE_WEBHOOK_SECRET,
      price: process.env.STRIPE_PRICE_PRO,
    };
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_PRICE_PRO;
    try {
      const status = getBillingStatus();
      expect(status.live).toBe(false);
      expect(status.configured).toBe(false);
      expect(status.missing).toContain("STRIPE_SECRET_KEY");
    } finally {
      if (prev.secret !== undefined) process.env.STRIPE_SECRET_KEY = prev.secret;
      else delete process.env.STRIPE_SECRET_KEY;
      if (prev.wh !== undefined) process.env.STRIPE_WEBHOOK_SECRET = prev.wh;
      else delete process.env.STRIPE_WEBHOOK_SECRET;
      if (prev.price !== undefined) process.env.STRIPE_PRICE_PRO = prev.price;
      else delete process.env.STRIPE_PRICE_PRO;
    }
  });

  it("returns live=true when all Stripe env vars are present", () => {
    const prev = {
      secret: process.env.STRIPE_SECRET_KEY,
      wh: process.env.STRIPE_WEBHOOK_SECRET,
      price: process.env.STRIPE_PRICE_PRO,
    };
    try {
      process.env.STRIPE_SECRET_KEY = "sk_test_abc";
      process.env.STRIPE_WEBHOOK_SECRET = "whsec_abc";
      process.env.STRIPE_PRICE_PRO = "price_abc";
      const status = getBillingStatus();
      expect(status.live).toBe(true);
      expect(status.configured).toBe(true);
      expect(status.missing).toEqual([]);
    } finally {
      if (prev.secret !== undefined) process.env.STRIPE_SECRET_KEY = prev.secret;
      else delete process.env.STRIPE_SECRET_KEY;
      if (prev.wh !== undefined) process.env.STRIPE_WEBHOOK_SECRET = prev.wh;
      else delete process.env.STRIPE_WEBHOOK_SECRET;
      if (prev.price !== undefined) process.env.STRIPE_PRICE_PRO = prev.price;
      else delete process.env.STRIPE_PRICE_PRO;
    }
  });
});
