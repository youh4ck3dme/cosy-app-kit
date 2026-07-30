import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getBillingStatusFn } from "@/lib/billing/billing-status.functions";
import {
  FREE_REPAIR_PASSES_MONTHLY,
  PRO_PLAN_LABEL,
  PRO_REPAIR_PASSES_MONTHLY,
} from "@/lib/billing/repair-passes";

/**
 * Upgrade to CAI Pro — opens Stripe Checkout (Artifact Insurance = repair passes).
 * Only renders when billing is live (Stripe configured).
 */
export function UpgradeProButton({ className }: { className?: string }) {
  const getBillingStatus = useServerFn(getBillingStatusFn);
  const { data: billing } = useQuery({
    queryKey: ["billing-status"],
    queryFn: () => getBillingStatus(),
  });
  const [loading, setLoading] = useState(false);

  // Don't render if billing is not live
  if (billing && !billing.live) {
    return (
      <div className={className} data-testid="upgrade-pro">
        <div className="rounded-md border border-border-subtle bg-surface-2/40 p-3 opacity-60">
          <div className="text-sm font-medium text-muted-foreground">
            Pro Plan
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Coming soon
          </p>
        </div>
      </div>
    );
  }

  async function onUpgrade() {
    setLoading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (sess.session?.access_token) {
        headers.Authorization = `Bearer ${sess.session.access_token}`;
      }
      const res = await fetch("/api/stripe/checkout", { method: "POST", headers });
      const body = (await res.json()) as {
        ok?: boolean;
        url?: string;
        error?: string;
        hint?: string;
      };
      if (!res.ok || !body.ok || !body.url) {
        toast.error(body.error ?? "Checkout unavailable", {
          description: body.hint ?? "Stripe keys may be missing on the server.",
        });
        return;
      }
      window.location.assign(body.url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={className} data-testid="upgrade-pro">
      <div className="rounded-md border border-border-subtle bg-surface-2/40 p-3">
        <div className="text-sm font-medium text-foreground">{PRO_PLAN_LABEL}</div>
        <p className="mt-1 text-xs text-muted-foreground">
          Artifact Insurance: {PRO_REPAIR_PASSES_MONTHLY} auto-repair passes / month (free:{" "}
          {FREE_REPAIR_PASSES_MONTHLY}). Not a seat license — ZIP gate warranty.
        </p>
        <button
          type="button"
          data-testid="upgrade-pro-button"
          disabled={loading}
          onClick={onUpgrade}
          className="mt-3 inline-flex min-h-11 items-center gap-2 border border-foreground bg-foreground px-3 text-sm font-medium text-background disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Upgrade to Pro
        </button>
      </div>
    </div>
  );
}
