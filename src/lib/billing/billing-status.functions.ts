import { createServerFn } from "@tanstack/react-start";
import { getBillingStatus, type BillingStatus } from "./billing-status.server";

/**
 * Server function to check if billing is live/configured.
 * Does not require auth — used to gate UI elements.
 * Does not throw — always returns {live: boolean, ...}.
 */
export const getBillingStatusFn = createServerFn({ method: "GET" })
  .middleware([])
  .handler(async (): Promise<BillingStatus> => {
    return getBillingStatus();
  });
