import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { authSearch } from "@/integrations/lovable";

export const Route = createFileRoute("/.lovable/oauth/consent")({
  // Browser-only: Supabase reads its session from localStorage.
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: authSearch(next) });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    // supabase.auth.oauth is beta — cast until types catch up.
    const oauth = (supabase.auth as unknown as { oauth: OAuthNamespace }).oauth;
    const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center p-6 text-center">
      <h1 className="mb-3 text-xl font-semibold">Authorization error</h1>
      <p className="text-sm text-muted-foreground">
        {String((error as Error)?.message ?? error)}
      </p>
    </main>
  ),
});

type OAuthResult = { data?: { redirect_url?: string; redirect_to?: string }; error?: { message: string } | null };
type OAuthDetails = {
  data?: {
    client?: { name?: string; client_uri?: string } | null;
    redirect_url?: string;
    redirect_to?: string;
    scopes?: string[];
  } | null;
  error?: { message: string } | null;
};
type OAuthNamespace = {
  getAuthorizationDetails: (id: string) => Promise<OAuthDetails>;
  approveAuthorization: (id: string) => Promise<OAuthResult>;
  denyAuthorization: (id: string) => Promise<OAuthResult>;
};

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "an app";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const oauth = (supabase.auth as unknown as { oauth: OAuthNamespace }).oauth;
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorization_id)
      : await oauth.denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center p-6">
      <div className="w-full rounded-2xl border border-border bg-panel/80 p-6 shadow-2xl backdrop-blur">
        <h1 className="mb-2 text-xl font-semibold">Connect {clientName} to your account</h1>
        <p className="mb-1 text-sm text-muted-foreground">
          This lets <span className="font-medium text-foreground">{clientName}</span> use AI Builder as you.
        </p>
        <p className="mb-6 text-xs text-muted-foreground">
          It can read your chat threads, messages, and artifacts, and create new threads. This does not
          bypass this app's permissions — row-level security still applies.
        </p>
        {error && (
          <p role="alert" className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-300">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            Approve
          </button>
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="flex-1 rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-medium hover:bg-elevated disabled:opacity-50"
          >
            Deny
          </button>
        </div>
      </div>
    </main>
  );
}
