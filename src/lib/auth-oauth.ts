/** Loopback dev host check — localhost / 127.0.0.1 only (no RFC1918 LAN). */
export function isLocalHost(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

/**
 * Allowed OAuth return targets when bouncing from a published origin to local dev.
 * Loopback only — never RFC1918 or arbitrary hosts.
 */
export function isLocalDevReturnUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const h = u.hostname.toLowerCase();
    return h === "localhost" || h === "127.0.0.1" || h === "::1";
  } catch {
    return false;
  }
}

/** Read OAuth tokens from URL hash only — never from query string (security). */
export function extractOAuthTokensFromHash(): {
  access_token: string;
  refresh_token: string;
  state?: string;
} | null {
  if (typeof window === "undefined") return null;
  const fromHash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const access_token = fromHash.get("access_token") || fromHash.get("accessToken");
  const refresh_token = fromHash.get("refresh_token") || fromHash.get("refreshToken");
  const state = fromHash.get("state") || undefined;
  if (!access_token || !refresh_token) return null;
  return { access_token, refresh_token, state };
}

/** @deprecated Use extractOAuthTokensFromHash — query-string tokens are ignored. */
export function extractOAuthTokensFromLocation(): ReturnType<
  typeof extractOAuthTokensFromHash
> {
  return extractOAuthTokensFromHash();
}

export function stripOAuthParamsFromUrl() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  [
    "code",
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
    "error",
    "error_description",
  ].forEach((k) => url.searchParams.delete(k));
  url.hash = "";
  window.history.replaceState({}, document.title, url.pathname + url.search);
}
