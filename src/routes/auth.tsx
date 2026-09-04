import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthPendingShell, AuthScreen } from "@/components/auth/AuthScreen";
import { isLocalHost, stripOAuthParamsFromUrl } from "@/lib/auth-oauth";
import { toast } from "sonner";
import {
  formatGoogleSignInError,
  isGoogleProviderDisabledError,
  logGoogleProviderSetupHint,
} from "@/lib/auth-google";
import { signInWithAccessCode } from "@/lib/access-code.functions";
import { claimDeveloperEntry } from "@/lib/dev-entry.functions";
import { useServerFn } from "@tanstack/react-start";

export { AuthPendingShell };

export const Route = createFileRoute("/auth")({
  ssr: false,
  pendingComponent: AuthPendingShell,
  head: () => ({
    meta: [
      { title: "Sign in — COSY.AI" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Prihlásenie do COSY.AI — Vitaj v cosy." },
      { name: "theme-color", content: "#f7f5f2" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&display=swap",
      },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    next:
      typeof s.next === "string" && s.next.startsWith("/") && !s.next.startsWith("//")
        ? s.next
        : "",
    oauth_stage: "",
    lr: "",
    provider: "",
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
  const [accessCode, setAccessCode] = useState("");
  const [accessCodeError, setAccessCodeError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [accessCodeLoading, setAccessCodeLoading] = useState(false);
  const [devLoading, setDevLoading] = useState(false);
  const [bridging, setBridging] = useState(true);
  const [showDeveloperEntry, setShowDeveloperEntry] = useState(false);
  const claimDevEntry = useServerFn(claimDeveloperEntry);
  const accessCodeSignIn = useServerFn(signInWithAccessCode);
  const [mounted, setMounted] = useState(false);

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

  useEffect(() => {
    let cancelled = false;
    setMounted(true);
    setShowDeveloperEntry(isLocalHost() || import.meta.env.DEV);

    const bridgeTimer = window.setTimeout(() => {
      if (!cancelled) setBridging(false);
    }, 12_000);

    (async () => {
      try {
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr) {
          const msg = (userErr.message || "").toLowerCase();
          if (
            msg.includes("jwt") ||
            msg.includes("kid") ||
            msg.includes("unverifiable") ||
            msg.includes("invalid")
          ) {
            await supabase.auth.signOut({ scope: "local" });
          }
        }
        if (cancelled) return;

        const { data } = await supabase.auth.getSession();
        if (cancelled) return;

        if (data.session) {
          if (
            window.location.hash.includes("access_token") ||
            window.location.search.includes("code=")
          ) {
            stripOAuthParamsFromUrl();
          }
          goTo(next || "/chat");
          return;
        }

        setBridging(false);
      } finally {
        window.clearTimeout(bridgeTimer);
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(bridgeTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- OAuth bootstrap once per landing
  }, []);

  const goNext = () => {
    goTo(next || "/chat");
  };

  const applySession = async (access_token: string, refresh_token: string) => {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) throw error;
    await router.invalidate();
    goNext();
  };

  const onEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setEmailLoading(true);
    try {
      if (mode === "signup") {
        const redirectPath = next || "/chat";
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}${redirectPath}` },
        });
        if (error) throw error;
        toast.success("Účet vytvorený. Môžeš sa prihlásiť.");
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
      setEmailLoading(false);
    }
  };

  const onGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const nextPath = next || "/chat";
      const redirectTo = `${window.location.origin}/auth${
        nextPath !== "/chat" ? `?next=${encodeURIComponent(nextPath)}` : ""
      }`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) {
        const raw = error.message;
        if (isGoogleProviderDisabledError(raw)) logGoogleProviderSetupHint();
        toast.error(formatGoogleSignInError(raw), { duration: 10_000 });
        setGoogleLoading(false);
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      if (isGoogleProviderDisabledError(raw)) logGoogleProviderSetupHint();
      toast.error(formatGoogleSignInError(raw), { duration: 10_000 });
      setGoogleLoading(false);
    }
  };

  const onAccessCodeSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAccessCodeError(null);
    setAccessCodeLoading(true);
    try {
      const session = await accessCodeSignIn({ data: { code: accessCode } });
      await applySession(session.access_token, session.refresh_token);
    } catch (err) {
      const msg = (err as Error).message || "Prihlásenie zlyhalo.";
      setAccessCodeError(msg);
    } finally {
      setAccessCodeLoading(false);
    }
  };

  const onDeveloperEntry = async () => {
    setDevLoading(true);
    try {
      const token = (import.meta.env.VITE_DEV_ENTRY_TOKEN as string | undefined)?.trim();
      if (!token) {
        throw new Error("Nastav VITE_DEV_ENTRY_TOKEN v .env.local (musí sedieť s DEV_ENTRY_TOKEN).");
      }
      const session = await claimDevEntry({ data: { token } });
      await applySession(session.access_token, session.refresh_token);
      toast.success("Developer entry");
    } catch (err) {
      toast.error((err as Error).message || "Developer entry failed");
    } finally {
      setDevLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  if (bridging) {
    return <AuthPendingShell />;
  }

  return (
    <AuthScreen
      mode={mode}
      onModeChange={setMode}
      email={email}
      onEmailChange={setEmail}
      password={password}
      onPasswordChange={setPassword}
      accessCode={accessCode}
      onAccessCodeChange={(value) => {
        setAccessCode(value);
        if (accessCodeError) setAccessCodeError(null);
      }}
      accessCodeError={accessCodeError}
      onGoogleSignIn={() => void onGoogleSignIn()}
      onEmailSubmit={(e) => void onEmailSubmit(e)}
      onAccessCodeSubmit={(e) => void onAccessCodeSubmit(e)}
      onDeveloperEntry={() => void onDeveloperEntry()}
      googleLoading={googleLoading}
      emailLoading={emailLoading}
      accessCodeLoading={accessCodeLoading}
      devLoading={devLoading}
      showDeveloperEntry={showDeveloperEntry}
    />
  );
}
