import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  bounceTokensToLocalDev,
  clearStagedLocalReturn,
  decodeOAuthState,
  extractOAuthTokensFromLocation,
  isLocalDevReturnUrl,
  isLocalHost,
  lovable,
  readStagedLocalReturn,
  startPublishedOAuthAfterStage,
  stripOAuthParamsFromUrl,
} from "@/integrations/lovable";
import { toast } from "sonner";
import { Loader2, Zap } from "lucide-react";
import { buildEmailRedirectTo } from "@/lib/auth-redirect";

/**
 * Shared shell for:
 * - route pendingComponent (ssr:false Suspense / ClientOnly fallback)
 * - OAuth bridge bootstrap
 * Must stay identical so SSR HTML and first client paint match (no hydration mismatch).
 */
function AuthPendingShell({ label = "Completing sign-in…" }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
      {label}
    </div>
  );
}

export const Route = createFileRoute("/auth")({
  ssr: false,
  // Critical: Match wraps ssr:false in Suspense + ClientOnly; without this the
  // server fallback is null while the client paints AuthPage → hydration error.
  pendingComponent: AuthPendingShell,
  head: () => ({
    meta: [
      { title: "Sign in — Builder" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Sign in to Builder — AI-first app studio." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    next:
      typeof s.next === "string" && s.next.startsWith("/") && !s.next.startsWith("//")
        ? s.next
        : "",
    // Always present so `to: "/auth", search: { next }` typechecks; empty = unset.
    oauth_stage: s.oauth_stage === "1" || s.oauth_stage === 1 ? "1" : "",
    lr: typeof s.lr === "string" ? s.lr : "",
    provider: typeof s.provider === "string" ? s.provider : "",
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const { next, oauth_stage, lr: lrParam, provider: providerParam } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  // true until client OAuth/session bootstrap finishes — same UI as pendingComponent
  const [bridging, setBridging] = useState(true);
  // Avoid isLocalHost() (window) on any pre-effect paint of the form copy.
  const [localHint, setLocalHint] = useState(false);

  const goTo = (path: string) => {
    if (path.startsWith("http")) {
      window.location.href = path;
      return;
    }
    if (path.startsWith("/")) {
      window.location.href = path;
      return;
    }
    navigate({ to: "/chat" });
  };

  // OAuth: stage from local → published OAuth → bounce tokens back to local.
  useEffect(() => {
    let cancelled = false;
    setLocalHint(isLocalHost());

    (async () => {
      // ── 1) Published: local hopped here to STAGE return URL, then start Google ──
      if (!isLocalHost() && oauth_stage === "1" && lrParam && isLocalDevReturnUrl(lrParam)) {
        const nextPath = next || "/chat";
        const provider = (
          providerParam === "apple" || providerParam === "microsoft" || providerParam === "lovable"
            ? providerParam
            : "google"
        ) as "google" | "apple" | "microsoft" | "lovable";
        startPublishedOAuthAfterStage(provider, lrParam, nextPath);
        return;
      }

      // ── 2) Tokens in URL (hash/query) after OAuth broker ──
      const tokens = extractOAuthTokensFromLocation();
      if (tokens) {
        const st = decodeOAuthState(tokens.state);
        const staged = !isLocalHost() ? readStagedLocalReturn() : null;
        const lr = (st?.lr && isLocalDevReturnUrl(st.lr) ? st.lr : null) || staged?.lr || null;
        const nextPath = st?.next || staged?.next || next || "/chat";

        // On production with a local return target → bounce home (do NOT setSession on prod)
        if (lr && !isLocalHost()) {
          bounceTokensToLocalDev({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            state: tokens.state,
            lr,
            next: nextPath,
          });
          return;
        }

        // Local (or prod without bridge): apply session here
        try {
          const { error } = await supabase.auth.setSession({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
          });
          if (error) throw error;
          stripOAuthParamsFromUrl();
          clearStagedLocalReturn();
          if (cancelled) return;
          const dest =
            nextPath ||
            new URLSearchParams(window.location.hash.replace(/^#/, "")).get("next") ||
            "/chat";
          goTo(dest.startsWith("/") ? dest : "/chat");
          return;
        } catch (e) {
          if (!cancelled) {
            toast.error((e as Error).message || "Failed to apply Google session");
            stripOAuthParamsFromUrl();
          }
        }
      }

      // ── 3) Already signed in (cookie session on this origin) ──
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      if (data.session) {
        // Critical: if production has session after OAuth but no hash tokens,
        // still bounce to local when we staged lr (broker may drop hash/state).
        const staged = !isLocalHost() ? readStagedLocalReturn() : null;
        if (staged?.lr && !isLocalHost()) {
          const { access_token, refresh_token } = data.session;
          if (access_token && refresh_token) {
            bounceTokensToLocalDev({
              access_token,
              refresh_token,
              lr: staged.lr,
              next: staged.next,
            });
            return;
          }
        }
        goTo(next || "/chat");
        return;
      }

      setBridging(false);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- OAuth bootstrap once per landing
  }, []);

  const goNext = () => {
    goTo(next || "/chat");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        // Must land on /auth so hash tokens (email confirm) are applied via setSession.
        // Never send confirm links to bare /chat or a wrong Site URL fallback.
        const emailRedirectTo = buildEmailRedirectTo(window.location.origin, next || "/chat");
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo },
        });
        if (error) throw error;
        toast.success("Check your email to confirm, or sign in if confirmation is off.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await router.invalidate();
        goNext();
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setLoading(true);
    try {
      const nextPath = next || "/chat";
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}${nextPath}`,
        nextPath,
      });
      if (result.error) {
        toast.error(result.error.message, { duration: 8_000 });
        setLoading(false);
        return;
      }
      // Full-page redirect (local stage or production) — keep loading until unload.
      if (result.redirected) return;
      await router.invalidate();
      goNext();
    } catch (err) {
      toast.error((err as Error).message || "Google sign-in failed");
      setLoading(false);
    }
  };

  if (bridging) {
    return <AuthPendingShell />;
  }

  return (
    <div className="relative min-h-screen bg-background bg-grid-pattern">
      <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent via-background/60 to-background" />
      <div
        id="main-content"
        className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-10"
      >
        <div className="mb-8 flex items-center gap-2 font-mono text-sm font-semibold tracking-tight">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-panel">
            <Zap className="h-4 w-4" />
          </span>
          BUILDER
        </div>

        <div className="w-full rounded-2xl border border-border bg-panel/80 p-6 shadow-2xl backdrop-blur">
          <h1 className="mb-1 text-xl font-semibold">
            {mode === "signin" ? "Sign in to Builder" : "Create your Builder account"}
          </h1>
          <p className="mb-6 text-sm text-muted-foreground">
            {mode === "signin"
              ? localHint
                ? "Google: short hop via published app, then returns here. Or use email."
                : "Continue where you left off."
              : "Start building with your own AI agent."}
          </p>

          <button
            onClick={google}
            disabled={loading}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-medium hover:bg-elevated disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
            Continue with Google
          </button>

          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            or
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            <input
              id="auth-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-ring"
            />
            <input
              id="auth-password"
              name="password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              minLength={6}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-ring"
            />
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground"
          >
            {mode === "signin" ? "No account yet? Create one" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-1.65 4.1-5.5 4.1-3.31 0-6.01-2.74-6.01-6.1S8.69 5.9 12 5.9c1.88 0 3.14.8 3.86 1.49l2.63-2.55C16.86 3.29 14.65 2.4 12 2.4 6.86 2.4 2.7 6.56 2.7 11.7S6.86 21 12 21c6.9 0 9.3-4.85 9.3-7.79 0-.53-.06-.93-.13-1.31H12z"
      />
    </svg>
  );
}
