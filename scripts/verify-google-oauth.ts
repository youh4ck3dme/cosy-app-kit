/**
 * Verify Google OAuth path for Lovable-hosted cosy-app-kit.
 *
 * Lovable broker (preferred):
 *   GET https://cosy-app-kit.lovable.app/~oauth/initiate  (expect not 404)
 *
 * Native Supabase authorize (only if Google provider enabled in Supabase):
 *   GET …/auth/v1/authorize?provider=google → 302 accounts.google.com
 *
 *   bun run verify:google-oauth
 */
const PROJECT = "uotvcsjoriamsagfprbq";
const PUBLISHED = "https://cosy-app-kit.lovable.app";
const REDIRECT = encodeURIComponent(`${PUBLISHED}/auth`);

async function checkLovableBroker() {
  const url = `${PUBLISHED}/~oauth/initiate`;
  const res = await fetch(url, { redirect: "manual" });
  return {
    url,
    status: res.status,
    ok: res.status !== 404,
  };
}

async function checkSupabaseAuthorize() {
  const url = `https://${PROJECT}.supabase.co/auth/v1/authorize?provider=google&redirect_to=${REDIRECT}`;
  const res = await fetch(url, { redirect: "manual" });
  const location = res.headers.get("location") || "";
  const body = res.status >= 400 ? (await res.text()).slice(0, 200) : "";
  return {
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

const broker = await checkLovableBroker();
const supabaseAuth = await checkSupabaseAuthorize();

console.log(JSON.stringify({ lovableBroker: broker, supabaseAuthorize: supabaseAuth }, null, 2));

if (!broker.ok && !supabaseAuth.ok) {
  console.error(`
Google OAuth not ready.

Lovable path (you chose this):
1. Google Cloud → OAuth client → add Authorized redirect URIs:
   - https://oauth.lovable.app/callback
   - https://cosy-app-kit.lovable.app/~oauth/callback
   - https://${PROJECT}.supabase.co/auth/v1/callback  (keep)
2. Lovable → Nastavenia Googlu → check BOTH redirect URI boxes → Save.
3. External Testing → add your Gmail as test user.
4. Re-run: bun run verify:google-oauth
`);
  process.exit(1);
}

if (broker.ok) {
  console.log("\nLovable /~oauth broker reachable — use Continue with Google on published app.");
}
if (supabaseAuth.ok) {
  console.log("Supabase Google authorize OK (302 → Google).");
} else if (supabaseAuth.providerDisabled) {
  console.log(
    "\nNote: native Supabase Google provider still disabled — OK if Lovable broker handles OAuth.",
  );
}

process.exit(0);
