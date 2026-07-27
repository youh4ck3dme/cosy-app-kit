/**
 * Public Supabase project config for the browser client.
 *
 * The publishable/anon key is DESIGNED to ship in frontend bundles (RLS protects data).
 * It is NOT a service_role secret. Kept here so Lovable/Vite builds work even when
 * Cloud env injection fails — GitGuardian: see .gitguardian.yaml paths-ignore.
 *
 * Prefer env when present (local .env / Lovable Secrets):
 *   VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY
 *   SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY
 */
export const PUBLIC_SUPABASE_URL = "https://uotvcsjoriamsagfprbq.supabase.co";
export const PUBLIC_SUPABASE_PROJECT_ID = "uotvcsjoriamsagfprbq";

/** Publishable key (sb_publishable_*) — safe for client, never service_role / sb_secret_ */
export const PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_v96SvdA0CjiqV0y7bGrMhw_ufkBaBBP";
