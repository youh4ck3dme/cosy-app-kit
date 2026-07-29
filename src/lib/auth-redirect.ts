/**
 * Pure helpers for email-confirm / magic-link redirects (port-agnostic).
 * Builder dev server is http://localhost:8080 — Site URL in Supabase must match.
 */

export const BUILDER_DEV_ORIGIN = "http://localhost:8080";
export const BUILDER_PROD_ORIGIN = "https://cosy-app-kit.lovable.app";

/** Canonical signup / magic-link target so /auth can apply hash tokens. */
export function buildEmailRedirectTo(origin: string, nextPath = "/chat"): string {
  const next = nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/chat";
  return `${origin.replace(/\/$/, "")}/auth?next=${encodeURIComponent(next)}`;
}

/**
 * If the app landed with #access_token on a non-/auth path, build /auth?next=…#hash
 * so setSession runs. Returns null when no hop is needed.
 */
export function authHashRecoveryLocation(opts: {
  pathname: string;
  search?: string;
  hash: string;
}): string | null {
  const hash = (opts.hash || "").replace(/^#/, "");
  if (!hash.includes("access_token=")) return null;
  if (opts.pathname.startsWith("/auth")) return null;

  const path = `${opts.pathname}${opts.search ?? ""}`;
  const next = path && path !== "/" ? path : "/chat";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/chat";
  return `/auth?next=${encodeURIComponent(safeNext)}#${hash}`;
}

/** Supabase Auth URL allow-list entries for this product. */
export function supabaseAuthRedirectAllowList(opts?: {
  siteOrigin?: string;
  prodOrigin?: string;
}): string[] {
  const site = (opts?.siteOrigin ?? BUILDER_DEV_ORIGIN).replace(/\/$/, "");
  const prod = (opts?.prodOrigin ?? BUILDER_PROD_ORIGIN).replace(/\/$/, "");
  return [
    site,
    `${site}/**`,
    "http://127.0.0.1:8080",
    "http://127.0.0.1:8080/**",
    prod,
    `${prod}/**`,
  ];
}
