import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Zap } from "lucide-react";

/**
 * Shared shell for auth pending/loading states.
 */
function AuthPendingShell({ label = "Checking session…" }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
      {label}
    </div>
  );
}

export const Route = createFileRoute("/auth")({
  ssr: false,
  pendingComponent: AuthPendingShell,
  head: () => ({
    meta: [
      { title: "Sign in — COSY.AI" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Sign in to COSY.AI — Visual Code Engine." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    next:
      typeof s.next === "string" && s.next.startsWith("/") && !s.next.startsWith("//")
        ? s.next
        : "",
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const { next } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [mounted, setMounted] = useState(false);

  const goTo = (path: string) => {
    if (path.startsWith("http") || path.startsWith("/")) {
      window.location.href = path;
      return;
    }
    navigate({ to: "/chat" });
  };

  useEffect(() => {
    let cancelled = false;
    setMounted(true);

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;

        if (data.session) {
          goTo(next || "/chat");
          return;
        }
      } catch (e) {
        console.error("[Auth] Session check failed:", e);
      } finally {
        if (!cancelled) setCheckingSession(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [next]);

  const goNext = () => {
    goTo(next || "/chat");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const redirectPath = next || "/chat";
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}${redirectPath}` },
        });
        if (error) throw error;
        toast.success("Account created. You can sign in now.");
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

  if (!mounted) {
    return null;
  }

  if (checkingSession) {
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
          COSY.AI
        </div>

        <div
          data-testid="auth-sign-in"
          className="w-full rounded-2xl border border-border bg-panel/80 p-6 shadow-2xl backdrop-blur"
        >
          <h1 className="mb-1 text-xl font-semibold">
            {mode === "signin" ? "Sign in to COSY.AI" : "Create your COSY.AI account"}
          </h1>
          <p className="mb-6 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Sign in with your email and password."
              : "Start building with your own AI engine."}
          </p>

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
