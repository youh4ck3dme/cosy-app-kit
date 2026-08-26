/**
 * Verify native Supabase Google OAuth for Cosy (Vercel prod + local dev).
 *
 *   bun run verify:google-oauth
 *
 * Expect 302 → accounts.google.com once Google provider is enabled in Supabase.
 */
const PROJECT = "uotvcsjoriamsagfprbq";
const PROD_AUTH = "https://cosy-app-kit.vercel.app/auth";
const LOCAL_AUTH = "http://127.0.0.1:8080/auth";

async function checkSupabaseAuthorize(redirectTo: string, label: string) {
  const url = `https://${PROJECT}.supabase.co/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;
  const res = await fetch(url, { redirect: "manual" });
  const location = res.headers.get("location") || "";
  const body = res.status >= 400 ? (await res.text()).slice(0, 300) : "";
  return {
    label,
    redirectTo,
    status: res.status,
    locationHost: (() => {
      try {
        return location ? new URL(location).host : null;
      } catch {
        return "bad-location";
      }
    })(),
    ok: res.status >= 300 && res.status < 400 && location.includes("accounts.google.com"),
    providerDisabled: /provider is not enabled/i.test(body),
  };
}

const prod = await checkSupabaseAuthorize(PROD_AUTH, "prod");
const local = await checkSupabaseAuthorize(LOCAL_AUTH, "local");

console.log(JSON.stringify({ supabaseAuthorize: { prod, local } }, null, 2));

if (!prod.ok && !local.ok) {
  console.error(`
Google OAuth not ready (native Supabase path).

1. Supabase → Authentication → Providers → Google → Enable + paste Client ID/Secret.
2. Supabase → Authentication → URL configuration → Redirect URLs:
   - ${PROD_AUTH}
   - ${LOCAL_AUTH}
3. Google Cloud → OAuth client → Authorized redirect URIs:
   - https://${PROJECT}.supabase.co/auth/v1/callback
4. Re-run: bun run verify:google-oauth
`);
  process.exit(1);
}

if (prod.ok) console.log("\nProd Google authorize OK (302 → accounts.google.com).");
if (local.ok) console.log("Local Google authorize OK (302 → accounts.google.com).");
if (!prod.ok && prod.providerDisabled) {
  console.log("\nNote: Google provider still disabled in Supabase — enable it in the dashboard.");
}

process.exit(0);
