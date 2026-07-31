import { createServerFn } from "@tanstack/react-start";
import { getRepairQuota } from "./metering.server";

/**
 * T30 - Server function to get current repair pass quota for the authenticated user.
 * Used by Canvas component to display real quota chip (not fake "5 left today").
 */
export const getRepairQuotaFn = createServerFn({ method: "GET" })
  .middleware([])
  .handler(async () => {
    // Get user ID from session
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) {
      // For anonymous users, return free plan info without actual usage
      return {
        used: 0,
        limit: 5,
        remaining: 5,
        period: "2026-07",
        isAuthenticated: false,
      };
    }

    const quota = await getRepairQuota(userId);
    return { ...quota, isAuthenticated: true };
  });
