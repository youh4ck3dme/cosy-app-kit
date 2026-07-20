// Local Google OAuth without popups.
// Lovable broker rejects redirect_uri=http://localhost → full-page via published
// origin, then /auth bridges tokens back to localhost (see auth.tsx).

import { createLovableAuth } from "@lovable.dev/cloud-auth-js";
import { supabase } from "../supabase/client";

export const PUBLISHED_ORIGIN = "https://cosy-app-kit.lovable.app";

/** RFC1918 / loopback — used for LAN phone testing (e.g. http://192.168.0.4:8080). */
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
  ].forEach((k) => url.searchParams.delete(k));
  url.hash = "";
  window.history.replaceState({}, document.title, url.pathname + url.search);
}

/**
 * Full-page Google OAuth for localhost — NO popup.
 * Lands on published /auth first (allowlisted redirect_uri), then bridges home.
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

  const state = encodeOAuthState({
    v: 1,
    n: generateNonce(),
    lr: `${window.location.origin}/auth`,
    next: nextPath.startsWith("/") ? nextPath : "/chat",
  });

  const params = new URLSearchParams({
    provider,
    // Must be allowlisted production URL — not localhost
    redirect_uri: `${PUBLISHED_ORIGIN}/auth`,
    state,
  });

  window.location.href = `${PUBLISHED_ORIGIN}/~oauth/initiate?${params.toString()}`;
  return { error: null, redirected: true };
}

export const lovable = {
  auth: {
    signInWithOAuth: async (
      provider: "google" | "apple" | "microsoft" | "lovable",
      opts?: SignInOptions,
    ) => {
      // Local Google: full-page, no popup (popups blocked / user preference).
      if (isLocalHost() && provider === "google") {
        return signInWithOAuthLocalFullPage(provider, opts);
      }

      const result = await lovableAuth.signInWithOAuth(provider, {
        redirect_uri: opts?.redirect_uri,
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
