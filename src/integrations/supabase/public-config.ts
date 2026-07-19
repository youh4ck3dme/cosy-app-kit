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
export const PUBLIC_SUPABASE_URL = "https://hyffmlempcfmgtnqllrz.supabase.co";
export const PUBLIC_SUPABASE_PROJECT_ID = "hyffmlempcfmgtnqllrz";

/** Anon / publishable key (role: anon) — safe for client, never service_role */
export const PUBLIC_SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
  "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5ZmZtbGVtcGNmbWd0bnFsbHJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzMTQzNDMsImV4cCI6MjA5OTg5MDM0M30." +
  "gm7FnP3C3ndkllmehShdAHbjtBNGcOx3qEGRwQHYcno";
