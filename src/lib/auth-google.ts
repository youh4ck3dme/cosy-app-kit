/** Map Supabase/OAuth errors to actionable UI copy. */
export function formatGoogleSignInError(raw: string): string {
  if (/provider is not enabled|unsupported provider/i.test(raw)) {
    return "Google nie je zapnutý. Lovable → Nastavenia Googlu: Enable + Client ID/Secret. V Google Cloud pridaj redirect: https://oauth.lovable.app/callback a https://cosy-app-kit.lovable.app/~oauth/callback. Potom skús znova.";
  }
  return raw || "Google sign-in failed";
}
