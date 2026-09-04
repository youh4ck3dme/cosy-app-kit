import { ArrowRight, Code2, Eye, EyeOff, Loader2, Menu } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { cn } from "@/lib/utils";

const GITHUB_URL = "https://github.com/youh4ck3dme/cosy-app-kit";

/** Must match auth route pendingComponent for hydration. */
export function AuthPendingShell({ label = "Prihlasovanie…" }: { label?: string }) {
  return (
    <div
      data-testid="auth-pending-shell"
      className="flex min-h-[100dvh] items-center justify-center bg-[#f7f5f2] text-sm text-neutral-600"
    >
      <Loader2
        className="mr-2 h-4 w-4 animate-spin text-[#c47651] motion-reduce:animate-none"
        aria-hidden
      />
      {label}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-1.65 4.1-5.5 4.1-3.31 0-6.01-2.74-6.01-6.1S8.69 5.9 12 5.9c1.88 0 3.14.8 3.86 1.49l2.63-2.55C16.86 3.29 14.65 2.4 12 2.4 6.86 2.4 2.7 6.56 2.7 11.7S6.86 21 12 21c6.9 0 9.3-4.85 9.3-7.79 0-.53-.06-.93-.13-1.31H12z"
      />
    </svg>
  );
}

export type AuthScreenProps = {
  mode: "signin" | "signup";
  onModeChange: (mode: "signin" | "signup") => void;
  email: string;
  onEmailChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  accessCode: string;
  onAccessCodeChange: (value: string) => void;
  accessCodeError: string | null;
  onGoogleSignIn: () => void;
  onEmailSubmit: (e: FormEvent) => void;
  onAccessCodeSubmit: (e: FormEvent) => void;
  onDeveloperEntry?: () => void;
  googleLoading: boolean;
  emailLoading: boolean;
  accessCodeLoading: boolean;
  devLoading: boolean;
  showDeveloperEntry?: boolean;
};

export function AuthScreen({
  mode,
  onModeChange,
  email,
  onEmailChange,
  password,
  onPasswordChange,
  accessCode,
  onAccessCodeChange,
  accessCodeError,
  onGoogleSignIn,
  onEmailSubmit,
  onAccessCodeSubmit,
  onDeveloperEntry,
  googleLoading,
  emailLoading,
  accessCodeLoading,
  devLoading,
  showDeveloperEntry = false,
}: AuthScreenProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showAccessCode, setShowAccessCode] = useState(false);
  const accessCodeId = useId();
  const accessCodeErrorId = `${accessCodeId}-error`;

  const anyLoading = googleLoading || emailLoading || accessCodeLoading || devLoading;

  return (
    <div className="relative min-h-[100dvh] bg-[#f7f5f2] text-neutral-900 selection:bg-[#c47651]/20">
      <header className="relative z-10 flex items-center justify-between px-5 py-4 sm:px-8">
        <a href="/" className="inline-flex items-center gap-2 font-semibold tracking-tight text-neutral-800">
          <span className="h-2 w-2 rounded-full bg-[#c47651]" aria-hidden />
          <span className="text-sm uppercase tracking-[0.18em]">COSY · STUDIO</span>
        </a>
        <nav className="hidden items-center gap-5 text-sm text-neutral-600 sm:flex">
          <a href="/" className="min-h-11 min-w-11 inline-flex items-center justify-center hover:text-neutral-900">
            Domov
          </a>
          <a
            href="/templates"
            className="min-h-11 min-w-11 inline-flex items-center justify-center hover:text-neutral-900"
          >
            Šablóny
          </a>
          <a
            href="/support"
            className="min-h-11 min-w-11 inline-flex items-center justify-center hover:text-neutral-900"
          >
            Podpora
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-11 min-w-11 inline-flex items-center justify-center hover:text-neutral-900"
          >
            GitHub
          </a>
        </nav>
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-md text-neutral-700 sm:hidden"
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      <main
        id="main-content"
        className="relative mx-auto flex max-w-lg flex-col items-center px-5 pb-12 pt-6 sm:px-8 sm:pt-10"
      >
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
          Prístupový kód
        </p>
        <h1
          className="mb-8 text-center font-serif text-4xl leading-tight tracking-tight sm:text-5xl"
          style={{ fontFamily: '"Fraunces", "Iowan Old Style", "Palatino Linotype", serif' }}
        >
          Vitaj v <span className="text-[#c47651]">cosy</span>
        </h1>

        <div
          data-testid="auth-sign-in"
          className="w-full rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-[0_12px_40px_-16px_rgba(60,40,20,0.18)] sm:p-8"
        >
          <button
            type="button"
            onClick={onGoogleSignIn}
            disabled={anyLoading}
            data-testid="auth-google-signin"
            className={cn(
              "mb-5 flex min-h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-neutral-200",
              "bg-white px-4 text-sm font-medium text-neutral-800 transition-colors",
              "hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c47651]/40",
              "disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none",
            )}
          >
            {googleLoading ? (
              <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden />
            ) : (
              <GoogleIcon />
            )}
            Pokračovať s Google
          </button>

          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-neutral-400">
            <div className="h-px flex-1 bg-neutral-200" />
            alebo
            <div className="h-px flex-1 bg-neutral-200" />
          </div>

          <form onSubmit={onEmailSubmit} className="space-y-3">
            <input
              id="auth-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="ty@firma.sk"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              disabled={anyLoading}
              className={inputClass}
            />
            <div className="relative">
              <input
                id="auth-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                required
                minLength={6}
                placeholder="Heslo"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                disabled={anyLoading}
                className={cn(inputClass, "pr-11")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-1 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-neutral-500 hover:text-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c47651]/40"
                aria-label={showPassword ? "Skryť heslo" : "Zobraziť heslo"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <button
              type="submit"
              disabled={anyLoading}
              className={primaryBtnClass}
            >
              {emailLoading && (
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
              )}
              {mode === "signin" ? "Prihlásiť sa" : "Vytvoriť účet"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => onModeChange(mode === "signin" ? "signup" : "signin")}
            disabled={anyLoading}
            className="mt-3 w-full min-h-11 text-center text-xs text-neutral-500 hover:text-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c47651]/40 rounded-md"
          >
            {mode === "signin" ? "Nemáš účet? Vytvor si ho" : "Už máš účet? Prihlás sa"}
          </button>

          <div className="my-6 h-px bg-neutral-100" />

          <form onSubmit={onAccessCodeSubmit} className="space-y-2">
            <label htmlFor={accessCodeId} className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Prístupový kód
            </label>
            <div className="relative">
              <input
                id={accessCodeId}
                data-testid="auth-access-code"
                name="accessCode"
                type={showAccessCode ? "text" : "password"}
                autoComplete="one-time-code"
                inputMode="text"
                placeholder="••••••••"
                value={accessCode}
                onChange={(e) => onAccessCodeChange(e.target.value)}
                disabled={anyLoading}
                aria-invalid={accessCodeError ? true : undefined}
                aria-describedby={accessCodeError ? accessCodeErrorId : undefined}
                className={cn(inputClass, "pr-11 font-mono tracking-widest")}
              />
              <button
                type="button"
                onClick={() => setShowAccessCode((v) => !v)}
                className="absolute right-1 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-neutral-500 hover:text-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c47651]/40"
                aria-label={showAccessCode ? "Skryť kód" : "Zobraziť kód"}
              >
                {showAccessCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {accessCodeError ? (
              <p id={accessCodeErrorId} role="alert" className="text-sm text-red-600">
                {accessCodeError}
              </p>
            ) : null}
            <button type="submit" disabled={anyLoading || !accessCode.trim()} className={primaryBtnClass}>
              {accessCodeLoading && (
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
              )}
              Vstúpiť
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </form>

          {showDeveloperEntry && onDeveloperEntry ? (
            <button
              type="button"
              data-testid="auth-developer-entry"
              disabled={anyLoading}
              onClick={onDeveloperEntry}
              className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-4 font-mono text-[11px] font-semibold uppercase tracking-wider text-neutral-500 transition-colors hover:border-neutral-400 hover:bg-neutral-100 hover:text-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c47651]/40 disabled:opacity-50 motion-reduce:transition-none"
            >
              {devLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />
              ) : (
                <Code2 className="h-3.5 w-3.5" />
              )}
              Developer — free entry
            </button>
          ) : null}
        </div>
      </main>
    </div>
  );
}

const inputClass = cn(
  "min-h-11 w-full rounded-xl border border-neutral-200 bg-white px-3.5 text-sm text-neutral-900",
  "placeholder:text-neutral-400 focus-visible:border-[#c47651]/50 focus-visible:outline-none",
  "focus-visible:ring-2 focus-visible:ring-[#c47651]/25 disabled:opacity-50 motion-reduce:transition-none",
);

const primaryBtnClass = cn(
  "flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#c47651] px-4",
  "text-sm font-semibold text-white transition-opacity hover:opacity-95",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c47651]/50 focus-visible:ring-offset-2",
  "disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none",
);
