/**
 * Auth search-param helpers.
 *
 * Google / OAuth provider sign-in was removed from this app — email + password
 * only. Keep this module tiny so `/auth` links stay typed in one place.
 */

/** Default /auth search bag — keep in sync with auth.tsx validateSearch. */
export const AUTH_SEARCH_DEFAULTS = {
  next: "",
} as const;

export function authSearch(next = ""): { next: string } {
  return { next: next.startsWith("/") ? next : "" };
}
