#!/usr/bin/env node
/**
 * Set Supabase Auth Site URL + redirect allow-list for cosy-app-kit.
 *
 * Requires a Management API token that OWNS project magqgwqyijuuaoovyjps:
 *   export SUPABASE_ACCESS_TOKEN=sbp_...   # Dashboard → Account → Access Tokens
 *   node scripts/set-supabase-auth-urls.mjs
 *
 * Default local app port is 8080 (Lovable/Vite sandbox).
 */
const REF = process.env.SUPABASE_PROJECT_ID || "magqgwqyijuuaoovyjps";
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_PAT || "";
const SITE = process.env.SUPABASE_SITE_URL || "http://localhost:8080";
const PROD = process.env.SUPABASE_PROD_URL || "https://cosy-app-kit.lovable.app";

if (!TOKEN) {
  console.error("Missing SUPABASE_ACCESS_TOKEN (sbp_… owner token for this project).");
  process.exit(1);
}

const allow = [
  `${SITE}`,
  `${SITE}/**`,
  "http://127.0.0.1:8080",
  "http://127.0.0.1:8080/**",
  "http://localhost:3000",
  "http://localhost:3000/**",
  PROD,
  `${PROD}/**`,
  "https://*.vercel.app/**",
].join(",");

const body = {
  site_url: SITE,
  uri_allow_list: allow,
};

const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/config/auth`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": "cosy-app-kit-auth-url-script/1.0",
  },
  body: JSON.stringify(body),
});

const text = await res.text();
let json;
try {
  json = JSON.parse(text);
} catch {
  json = { raw: text };
}

if (!res.ok) {
  console.error("PATCH failed", res.status, json);
  process.exit(1);
}

console.log("OK site_url =", json.site_url ?? SITE);
console.log("OK uri_allow_list =", json.uri_allow_list ?? allow);
console.log("Project", REF, "— Auth redirect fallback updated.");
