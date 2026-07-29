import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/** Local secrets file — gitignored. Prefer KEY=VALUE; bare email/password lines also work. */
export const E2E_AUTH_FILE = "e2e/e2e:authenticated.md";

export type E2eAuthLoadResult = {
  source: "env" | "file" | "none";
};

/**
 * Populate `process.env.E2E_EMAIL` / `E2E_PASSWORD` from the local file when unset.
 * Env vars always win. Never logs credential values.
 */
export function loadE2eAuthFromFile(cwd = process.cwd()): E2eAuthLoadResult {
  if (process.env.E2E_EMAIL && process.env.E2E_PASSWORD) {
    return { source: "env" };
  }

  const path = resolve(cwd, E2E_AUTH_FILE);
  if (!existsSync(path)) return { source: "none" };

  const raw = readFileSync(path, "utf8");
  let email = process.env.E2E_EMAIL?.trim() || undefined;
  let password = process.env.E2E_PASSWORD?.trim() || undefined;

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = /^(?:export\s+)?(E2E_EMAIL|E2E_PASSWORD)\s*=\s*(.*)$/.exec(trimmed);
    if (!m) continue;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (m[1] === "E2E_EMAIL") email = value;
    else password = value;
  }

  if (!email || !password) {
    const bare = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#") && !/=/.test(l));
    if (bare.length >= 2) {
      email ??= bare[0];
      password ??= bare[1];
    }
  }

  if (email) process.env.E2E_EMAIL = email;
  if (password) process.env.E2E_PASSWORD = password;

  return email && password ? { source: "file" } : { source: "none" };
}
