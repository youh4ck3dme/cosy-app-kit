/**
 * Billing status check — returns whether billing is live/configured.
 * Server-only. Does not throw — returns {live: boolean}.
 */

import { readStripeEnvStatus } from "./stripe-env.server";

export type BillingStatus = {
  live: boolean;
  configured: boolean;
  missing: string[];
};

/**
 * Check if billing is live (Stripe configured).
 * Returns {live: true} only when all required Stripe env vars are present.
 * Does NOT throw — safe to call from UI components via server functions.
 */
export function getBillingStatus(): BillingStatus {
  const status = readStripeEnvStatus();
  return {
    live: status.configured,
    configured: status.configured,
    missing: status.missing,
  };
}
