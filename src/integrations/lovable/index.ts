// Auth search helpers

/** Default /auth search bag — keep in sync with auth.tsx validateSearch. */
export const AUTH_SEARCH_DEFAULTS = {
  next: "",
} as const;

export function authSearch(next = ""): { next: string } {
  return { next };
}

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

export function isLocalDevReturnUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    return isPrivateOrLoopbackHost(u.hostname);
  } catch {
    return false;
  }
}

export function extractOAuthTokensFromLocation() {
  return null;
}

export function stripOAuthParamsFromUrl() {
  /* no-op */
}

export function readStagedLocalReturn() {
  return null;
}

export function clearStagedLocalReturn() {
  /* no-op */
}

export function bounceTokensToLocalDev() {
  /* no-op */
}

export function startPublishedOAuthAfterStage() {
  /* no-op */
}

export function encodeOAuthState(payload: Record<string, unknown>): string {
  const json = JSON.stringify(payload);
  return btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeOAuthState(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    let b64 = raw.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const obj = JSON.parse(atob(b64));
    if (obj?.v !== 1 || typeof obj.n !== "string") return null;
    return obj;
  } catch {
    return null;
  }
}

export const lovable = {
  auth: {
    signInWithOAuth: async () => {
      return {
        error: new Error("OAuth sign-in is disabled. Please sign in with email and password."),
        redirected: false,
      };
    },
  },
};

/** Public site origin for absolute artifact URLs (no Lovable broker). */
export const PUBLISHED_ORIGIN = (
  (typeof process !== "undefined" &&
    (process.env.VITE_PUBLIC_ORIGIN || process.env.PUBLIC_ORIGIN)) ||
  (typeof window !== "undefined" ? window.location.origin : "")
).replace(/\/$/, "") || "http://127.0.0.1:8080";

