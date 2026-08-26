import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Opt-in developer one-tap sign-in for local QA only.
 * Production must leave all vars unset (fail closed).
 *
 * Required server secrets (Lovable Cloud / local .env — never VITE_*):
 *   DEV_ENTRY_ENABLED=1
 *   DEV_ENTRY_EMAIL=…
 *   DEV_ENTRY_PASSWORD=…
 *   DEV_ENTRY_TOKEN=…   (caller must POST matching token)
 */
export function entryEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const flag = (env.DEV_ENTRY_ENABLED ?? "").trim();
  return flag === "1" || flag.toLowerCase() === "true";
}

export function assertDeveloperEntryAllowed(
  token: string,
  env: NodeJS.ProcessEnv = process.env,
): void {
  if (!entryEnabled(env)) {
    throw new Error("Developer entry is disabled on this deploy.");
  }
  const expectedToken = (env.DEV_ENTRY_TOKEN ?? "").trim();
  if (!expectedToken || token !== expectedToken) {
    throw new Error("Forbidden");
  }
  if (!(env.DEV_ENTRY_EMAIL ?? "").trim()) {
    throw new Error("DEV_ENTRY_EMAIL is not configured.");
  }
  if (!(env.DEV_ENTRY_PASSWORD ?? "").trim()) {
    throw new Error("DEV_ENTRY_PASSWORD is not configured.");
  }
}

function resolveEmail(env: NodeJS.ProcessEnv = process.env): string {
  return (env.DEV_ENTRY_EMAIL ?? "").trim();
}

function resolvePassword(env: NodeJS.ProcessEnv = process.env): string {
  return (env.DEV_ENTRY_PASSWORD ?? "").trim();
}

export type DeveloperEntrySession = {
  access_token: string;
  refresh_token: string;
};

export const claimDeveloperEntry = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const o = input as { token?: unknown };
    return { token: typeof o?.token === "string" ? o.token.trim() : "" };
  })
  .handler(async ({ data }): Promise<DeveloperEntrySession> => {
    assertDeveloperEntryAllowed(data.token);

    const email = resolveEmail();
    const password = resolvePassword();

    const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();
    const anon = (
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      ""
    ).trim();
    if (!url || !anon) {
      throw new Error("Supabase URL/key missing on server.");
    }

    const client = createClient<Database>(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: signIn, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    const session = signIn.session;
    if (!session?.access_token || !session.refresh_token) {
      throw new Error("No session returned from developer sign-in.");
    }
    return {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    };
  });
