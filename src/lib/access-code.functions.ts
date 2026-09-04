import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type AccessCodeErrorCode = "INVALID" | "NOT_CONFIGURED" | "GUEST_NOT_CONFIGURED";

export class AccessCodeError extends Error {
  readonly code: AccessCodeErrorCode;

  constructor(code: AccessCodeErrorCode, message: string) {
    super(message);
    this.name = "AccessCodeError";
    this.code = code;
  }
}

/** Server-only gate — never expose expected code to client. */
export function assertAccessCode(code: string, env: NodeJS.ProcessEnv = process.env): void {
  const expected = (env.COSY_ACCESS_CODE ?? "").trim();
  if (!expected) {
    throw new AccessCodeError("NOT_CONFIGURED", "Prístupový kód nie je nastavený.");
  }
  if (code !== expected) {
    throw new AccessCodeError("INVALID", "Nesprávny prístupový kód.");
  }
}

export function resolveGuestCredentials(
  env: NodeJS.ProcessEnv = process.env,
): { email: string; password: string } {
  const email = (env.COSY_GUEST_EMAIL ?? "").trim();
  const password = (env.COSY_GUEST_PASSWORD ?? env.COSY_ACCESS_CODE ?? "").trim();
  if (!email || !password) {
    throw new AccessCodeError(
      "GUEST_NOT_CONFIGURED",
      "Hosťovské prihlásenie nie je nakonfigurované.",
    );
  }
  return { email, password };
}

export type AccessCodeSession = {
  access_token: string;
  refresh_token: string;
};

export const signInWithAccessCode = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const o = input as { code?: unknown };
    return { code: typeof o?.code === "string" ? o.code.trim() : "" };
  })
  .handler(async ({ data }): Promise<AccessCodeSession> => {
    assertAccessCode(data.code);
    const { email, password } = resolveGuestCredentials();

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
      throw new Error("No session returned from access-code sign-in.");
    }
    return {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    };
  });
