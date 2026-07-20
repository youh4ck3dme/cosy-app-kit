// Local Google OAuth without popups.
// Lovable broker rejects redirect_uri=http://localhost → stage on published
// origin (sessionStorage), complete OAuth there, then bounce tokens home.

import { createLovableAuth } from "@lovable.dev/cloud-auth-js";
import { supabase } from "../supabase/client";

export const PUBLISHED_ORIGIN = "https://cosy-app-kit.lovable.app";

/** Default /auth search bag — keep in sync with auth.tsx validateSearch. */
export const AUTH_SEARCH_DEFAULTS = {
  next: "",
  oauth_stage: "",
  lr: "",
  provider: "",
} as const;

export function authSearch(next = ""): {
  next: string;
  oauth_stage: string;
  lr: string;
  provider: string;
} {
  return { ...AUTH_SEARCH_DEFAULTS, next };
}

/** sessionStorage keys on the published domain (survive OAuth round-trip). */
export const OAUTH_SS_LR = "builder_oauth_lr";
export const OAUTH_SS_NEXT = "builder_oauth_next";

/** RFC1918 / loopback — LAN phone testing (e.g. http://192.168.0.4:8080). */
function isPrivateOrLoopbackHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h === "127.0.0.1" || h === "::1") return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  const m = /^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/.exec(h);
  if (m) {
    const n = Number(m[1]);
    if (n >= 16 && n <= 31) return true;
  }
  return false;
}

export function isLocalHost(): boolean {
  if (typeof window === "undefined") return false;
  return isPrivateOrLoopbackHost(window.location.hostname);
}

/**
 * Safe OAuth bounce target (published /auth → local dev).
 * Only loopback + private LAN http(s) origins — never arbitrary hosts.
 */
export function isLocalDevReturnUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    return isPrivateOrLoopbackHost(u.hostname);
  } catch {
    return false;
  }
}

const lovableAuth = createLovableAuth(
  isLocalHost() ? { oauthBrokerUrl: `${PUBLISHED_ORIGIN}/~oauth/initiate` } : undefined,
);

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
  /** App path after login, e.g. /chat */
  nextPath?: string;
};

export type OAuthStatePayload = {
  v: 1;
  n: string;
  /** Full local URL to return to, e.g. http://localhost:8080/auth */
  lr?: string;
  /** In-app next path, e.g. /chat */
  next?: string;
};

function generateNonce(): string {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    return [...crypto.getRandomValues(new Uint8Array(12))]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function encodeOAuthState(payload: OAuthStatePayload): string {
  const json = JSON.stringify(payload);
  return btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeOAuthState(raw: string | null | undefined): OAuthStatePayload | null {
  if (!raw) return null;
  try {
    let b64 = raw.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const obj = JSON.parse(atob(b64)) as OAuthStatePayload;
    if (obj?.v !== 1 || typeof obj.n !== "string") return null;
    return obj;
  } catch {
    return null;
  }
}

export function extractOAuthTokensFromLocation(): {
  access_token: string;
  refresh_token: string;
  state?: string;
} | null {
  if (typeof window === "undefined") return null;
  const fromHash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const fromQuery = new URLSearchParams(window.location.search);
  const access_token =
    fromHash.get("access_token") ||
    fromQuery.get("access_token") ||
    fromHash.get("accessToken") ||
    fromQuery.get("accessToken");
  const refresh_token =
    fromHash.get("refresh_token") ||
    fromQuery.get("refresh_token") ||
    fromHash.get("refreshToken") ||
    fromQuery.get("refreshToken");
  const state = fromHash.get("state") || fromQuery.get("state") || undefined;
  if (!access_token || !refresh_token) return null;
  return { access_token, refresh_token, state };
}

export function stripOAuthParamsFromUrl() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  [
    "access_token",
    "refresh_token",
    "accessToken",
    "refreshToken",
    "state",
    "token_type",
    "expires_in",
    "provider_token",
    "provider_refresh_token",
    "type",
    "oauth_stage",
    "lr",
    "next",
    "provider",
  ].forEach((k) => url.searchParams.delete(k));
  url.hash = "";
  window.history.replaceState({}, document.title, url.pathname + url.search);
}

function readStagedLocalReturn(): { lr: string; next: string } | null {
  try {
    const lr = sessionStorage.getItem(OAUTH_SS_LR);
    if (!lr || !isLocalDevReturnUrl(lr)) return null;
    const next = sessionStorage.getItem(OAUTH_SS_NEXT) || "/chat";
    return { lr, next: next.startsWith("/") ? next : "/chat" };
  } catch {
    return null;
  }
}

export function clearStagedLocalReturn() {
  try {
    sessionStorage.removeItem(OAUTH_SS_LR);
    sessionStorage.removeItem(OAUTH_SS_NEXT);
  } catch {
    /* ignore */
  }
}

/**
 * Bounce tokens from published origin → local /auth#tokens.
 * Used when OAuth finished on production (hash tokens or just-set session).
 */
export function bounceTokensToLocalDev(opts: {
  access_token: string;
  refresh_token: string;
  state?: string;
  lr: string;
  next?: string;
}): void {
  const target = new URL(opts.lr);
  // Always land on /auth on the local origin so bridge can setSession.
  target.pathname = "/auth";
  target.search = "";
  const hash = new URLSearchParams({
    access_token: opts.access_token,
    refresh_token: opts.refresh_token,
  });
  if (opts.state) hash.set("state", opts.state);
  if (opts.next) hash.set("next", opts.next);
  clearStagedLocalReturn();
  window.location.replace(`${target.origin}${target.pathname}#${hash.toString()}`);
}

/**
 * Local Google: hop to published /auth to STAGE return URL in sessionStorage,
 * then start OAuth with allowlisted redirect_uri. Survives when broker drops custom state.
 */
function signInWithOAuthLocalFullPage(
  provider: "google" | "apple" | "microsoft" | "lovable",
  opts?: SignInOptions,
): { error: null; redirected: true } {
  const nextPath =
    opts?.nextPath ||
    (opts?.redirect_uri?.startsWith(window.location.origin)
      ? opts.redirect_uri.slice(window.location.origin.length) || "/chat"
      : "/chat");
  const lr = `${window.location.origin}/auth`;
  const next = nextPath.startsWith("/") ? nextPath : "/chat";

  const stage = new URL(`${PUBLISHED_ORIGIN}/auth`);
  stage.searchParams.set("oauth_stage", "1");
  stage.searchParams.set("lr", lr);
  stage.searchParams.set("next", next);
  stage.searchParams.set("provider", provider);
  window.location.href = stage.toString();
  return { error: null, redirected: true };
}

/**
 * On published origin: after oauth_stage staging, kick broker with allowlisted redirect.
 */
export function startPublishedOAuthAfterStage(
  provider: "google" | "apple" | "microsoft" | "lovable",
  lr: string,
  next: string,
): void {
  try {
    sessionStorage.setItem(OAUTH_SS_LR, lr);
    sessionStorage.setItem(OAUTH_SS_NEXT, next);
  } catch {
    /* private mode */
  }

  const state = encodeOAuthState({
    v: 1,
    n: generateNonce(),
    lr,
    next,
  });

  const params = new URLSearchParams({
    provider,
    redirect_uri: `${PUBLISHED_ORIGIN}/auth`,
    state,
  });

  window.location.href = `${PUBLISHED_ORIGIN}/~oauth/initiate?${params.toString()}`;
}

export const lovable = {
  auth: {
    signInWithOAuth: async (
      provider: "google" | "apple" | "microsoft" | "lovable",
      opts?: SignInOptions,
    ) => {
      // Local Google: stage on published domain first (sessionStorage survives OAuth).
      if (isLocalHost() && provider === "google") {
        return signInWithOAuthLocalFullPage(provider, opts);
      }

      const result = await lovableAuth.signInWithOAuth(provider, {
        redirect_uri: opts?.redirect_uri ?? `${window.location.origin}/auth`,
        extraParams: {
          ...opts?.extraParams,
        },
      });

      if (result.redirected) {
        return result;
      }

      if (result.error) {
        return result;
      }

      try {
        await supabase.auth.setSession(result.tokens);
      } catch (e) {
        return { error: e instanceof Error ? e : new Error(String(e)) };
      }
      return result;
    },
  },
};

export { readStagedLocalReturn };
