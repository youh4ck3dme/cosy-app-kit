const GOOGLE_PROVIDER_DISABLED =
  /provider is not enabled|unsupported provider/i;

export const PROD_AUTH_REDIRECT = "https://cosy-app-kit.vercel.app/auth";
export const LOCAL_AUTH_REDIRECT = "http://127.0.0.1:8080/auth";

/** Short user-facing copy — no setup steps in toasts. */
export function formatGoogleSignInError(raw: string): string {
  if (GOOGLE_PROVIDER_DISABLED.test(raw)) {
    return "Google sign-in is not enabled for this app.";
  }
  return raw || "Google sign-in failed";
}

export function isGoogleProviderDisabledError(raw: string): boolean {
  return GOOGLE_PROVIDER_DISABLED.test(raw);
}

/** Operator/setup details — log to console, not toast. */
export function logGoogleProviderSetupHint(): void {
  console.error(
    "[auth] Enable Google in Supabase project uotvcsjoriamsagfprbq → Authentication → Providers → Google " +
      "(Client ID + Secret from Google Cloud). " +
      "Add redirect URLs in Supabase Auth → URL configuration: " +
      `${PROD_AUTH_REDIRECT}, ${LOCAL_AUTH_REDIRECT}. ` +
      "Google Cloud authorized redirect URI must include " +
      "https://uotvcsjoriamsagfprbq.supabase.co/auth/v1/callback",
  );
}
