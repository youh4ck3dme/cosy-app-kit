const GOOGLE_PROVIDER_DISABLED =
  /provider is not enabled|unsupported provider/i;

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
    "[auth] Google provider disabled. Enable in Lovable → Google settings (Client ID + Secret). " +
      "Redirect URIs: https://oauth.lovable.app/callback and " +
      "https://cosy-app-kit.lovable.app/~oauth/callback",
  );
}
