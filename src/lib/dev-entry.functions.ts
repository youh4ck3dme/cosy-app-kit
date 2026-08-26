import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Opt-in developer one-tap sign-in for local/LAN QA only.
 * Production stays closed unless explicitly enabled with server-only secrets:
 *   DEV_ENTRY_ENABLED=1
 *   DEV_ENTRY_EMAIL=…
 *   DEV_ENTRY_PASSWORD=…   (optional if service-role magic link works)
 *
 * Never use VITE_* for credentials — they ship in the client bundle.
 */
function entryEnabled(): boolean {
  const flag = (process.env.DEV_ENTRY_ENABLED ?? "").trim();
  return flag === "1" || flag.toLowerCase() === "true";
}

function resolveEmail(): string {
  return (process.env.DEV_ENTRY_EMAIL ?? "").trim();
}

function resolvePassword(): string {
  return (process.env.DEV_ENTRY_PASSWORD ?? "").trim();
}

export type DeveloperEntrySession = {
  access_token: string;
  refresh_token: string;
};

export const claimDeveloperEntry = createServerFn({ method: "POST" }).handler(
  async (): Promise<DeveloperEntrySession> => {
    if (!entryEnabled()) {
      throw new Error("Developer entry is disabled on this deploy.");
    }

    const email = resolveEmail();
    if (!email) {
      throw new Error("DEV_ENTRY_EMAIL is not configured.");
    }

    const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();
    const anon = (
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      ""
    ).trim();
    if (!url || !anon) {
      throw new Error("Supabase URL/key missing on server.");
    }

    const password = resolvePassword();
    if (password) {
      const client = createClient<Database>(url, anon, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      const session = data.session;
      if (!session?.access_token || !session.refresh_token) {
        throw new Error("No session returned from developer sign-in.");
      }
      return {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      };
    }

    // Passwordless path: service-role magic link → OTP verify (no password in client).
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (linkError) throw new Error(linkError.message);

    const otp =
      linkData.properties?.email_otp ||
      linkData.properties?.hashed_token ||
      "";
    if (!otp) {
      throw new Error(
        "Could not mint developer session (no OTP). Set DEV_ENTRY_PASSWORD in Lovable Secrets.",
      );
    }

    const verifyClient = createClient<Database>(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: verified, error: verifyError } = await verifyClient.auth.verifyOtp({
      email,
      token: otp,
      type: "magiclink",
    });
    if (verifyError) throw new Error(verifyError.message);
    const session = verified.session;
    if (!session?.access_token || !session.refresh_token) {
      throw new Error("verifyOtp returned no session.");
    }
    return {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    };
  },
);
