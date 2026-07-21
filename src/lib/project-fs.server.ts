/**
 * Server-only project preview FS: HMAC tokens + in-memory file cache + HTTP responses.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { buildPreviewBridgeScript } from "@/lib/preview-bridge";
import { injectScriptIntoHtmlHead } from "@/lib/preview-storage-polyfill";
import {
  artifactToFiles,
  buildPreviewCsp,
  isHtmlMime,
  resolveArtifactFile,
  type ProjectFsFile,
} from "@/lib/project-fs";

const TOKEN_TTL_SEC = 60 * 60;

type CacheEntry = {
  artifactId: string;
  files: ProjectFsFile[];
  entryPath: string | null;
  isPublic: boolean;
  exp: number;
};

const previewFileCache = new Map<string, CacheEntry>();

function previewSigningSecret(): string {
  return (
    process.env.PREVIEW_SIGNING_SECRET?.trim() ||
    process.env.MISTRAL_API_KEY?.trim() ||
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
    "dev-insecure-preview-secret"
  );
}

function b64url(buf: Buffer | string): string {
  const b = typeof buf === "string" ? Buffer.from(buf, "utf8") : buf;
  return b.toString("base64url");
}

function fromB64url(s: string): Buffer {
  return Buffer.from(s, "base64url");
}

function pruneCache() {
  const now = Math.floor(Date.now() / 1000);
  for (const [k, v] of previewFileCache) {
    if (v.exp < now) previewFileCache.delete(k);
  }
  if (previewFileCache.size > 200) {
    const first = previewFileCache.keys().next().value;
    if (first) previewFileCache.delete(first);
  }
}

export function signPreviewToken(artifactId: string, ttlSec = TOKEN_TTL_SEC): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const payload = `${artifactId}.${exp}`;
  const sig = createHmac("sha256", previewSigningSecret()).update(payload).digest();
  return `${b64url(payload)}.${b64url(sig)}`;
}

export function verifyPreviewToken(token: string, artifactId: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return false;
    const [payloadB64, sigB64] = parts;
    if (!payloadB64 || !sigB64) return false;
    const payload = fromB64url(payloadB64).toString("utf8");
    const [id, expStr] = payload.split(".");
    if (id !== artifactId) return false;
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
    const expected = createHmac("sha256", previewSigningSecret()).update(payload).digest();
    const got = fromB64url(sigB64);
    if (got.length !== expected.length) return false;
    return timingSafeEqual(got, expected);
  } catch {
    return false;
  }
}

export function cachePreviewFiles(opts: {
  token: string;
  artifactId: string;
  files: ProjectFsFile[];
  entryPath?: string | null;
  isPublic?: boolean;
  ttlSec?: number;
}): void {
  pruneCache();
  const ttl = opts.ttlSec ?? TOKEN_TTL_SEC;
  previewFileCache.set(opts.token, {
    artifactId: opts.artifactId,
    files: opts.files,
    entryPath: opts.entryPath ?? null,
    isPublic: Boolean(opts.isPublic),
    exp: Math.floor(Date.now() / 1000) + ttl,
  });
}

export function getCachedPreviewFiles(token: string, artifactId: string): CacheEntry | null {
  pruneCache();
  if (!verifyPreviewToken(token, artifactId)) return null;
  const hit = previewFileCache.get(token);
  if (!hit || hit.artifactId !== artifactId) return null;
  if (hit.exp < Math.floor(Date.now() / 1000)) {
    previewFileCache.delete(token);
    return null;
  }
  return hit;
}

export type ArtifactRow = {
  id: string;
  kind: string;
  content: string;
  files: unknown;
  entry_path: string | null;
  is_public: boolean;
};

function supabaseAnon() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
}

function supabaseAsUser(token: string) {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
}

export async function loadArtifactForPreview(opts: {
  artifactId: string;
  accessToken?: string | null;
  previewToken?: string | null;
}): Promise<{
  files: ProjectFsFile[];
  entryPath: string | null;
  access: "public" | "owner" | "token";
} | null> {
  const id = opts.artifactId;
  const select = "id,kind,content,files,entry_path,is_public";

  if (opts.previewToken) {
    const cached = getCachedPreviewFiles(opts.previewToken, id);
    if (cached) {
      return {
        files: cached.files,
        entryPath: cached.entryPath,
        access: cached.isPublic ? "public" : "token",
      };
    }
  }

  if (opts.accessToken) {
    const sb = supabaseAsUser(opts.accessToken);
    const { data, error } = await sb.from("artifacts").select(select).eq("id", id).maybeSingle();
    if (!error && data) {
      return {
        files: artifactToFiles(data as ArtifactRow),
        entryPath: (data as ArtifactRow).entry_path,
        access: data.is_public ? "public" : "owner",
      };
    }
  }

  {
    const sb = supabaseAnon();
    const { data, error } = await sb
      .from("artifacts")
      .select(select)
      .eq("id", id)
      .eq("is_public", true)
      .maybeSingle();
    if (!error && data) {
      return {
        files: artifactToFiles(data as ArtifactRow),
        entryPath: (data as ArtifactRow).entry_path,
        access: "public",
      };
    }
  }

  return null;
}

export function buildProjectFileResponse(opts: {
  files: ProjectFsFile[];
  requestPath: string;
  access: "public" | "owner" | "token";
  bridgeToken?: string;
  networkDisabled?: boolean;
}): Response {
  const resolved = resolveArtifactFile(opts.files, opts.requestPath);
  if (!resolved.ok) {
    return new Response(resolved.reason, { status: resolved.status });
  }

  let body: BodyInit = resolved.content;
  const headers = new Headers();
  headers.set("Content-Type", resolved.mime);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Content-Security-Policy", buildPreviewCsp({ networkDisabled: opts.networkDisabled }));
  headers.set("X-Frame-Options", "SAMEORIGIN");

  if (opts.access === "public") {
    headers.set("Cache-Control", "public, max-age=3600, immutable");
  } else {
    headers.set("Cache-Control", "private, max-age=60");
  }

  if (isHtmlMime(resolved.mime) && opts.bridgeToken) {
    let html = injectScriptIntoHtmlHead(
      resolved.content,
      buildPreviewBridgeScript(opts.bridgeToken, {
        networkDisabled: opts.networkDisabled,
        interceptHtmlNav: false,
      }),
    );
    html = injectScriptIntoHtmlHead(
      html,
      `<script>(function(){try{if(navigator.serviceWorker&&navigator.serviceWorker.register){navigator.serviceWorker.register=function(){return Promise.reject(new Error('SW disabled in preview'));};}}catch(e){}})();</script>`,
    );
    body = html;
  }

  if (/^image\/(png|jpeg|webp)$/.test(resolved.mime) && !resolved.content.startsWith("<")) {
    const b64 = resolved.content.replace(/^data:[^;]+;base64,/, "");
    try {
      body = Buffer.from(b64, "base64");
    } catch {
      body = resolved.content;
    }
  }

  return new Response(body, { status: 200, headers });
}

export async function handleProjectPreviewRequest(
  request: Request,
  opts: { artifactId: string; filePath: string },
): Promise<Response> {
  const url = new URL(request.url);
  const previewToken = url.searchParams.get("t");
  const bridgeToken = url.searchParams.get("bt") || previewToken || "preview";
  const networkDisabled = url.searchParams.get("net") === "0";

  const auth = request.headers.get("authorization");
  const accessToken = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length) : null;

  const loaded = await loadArtifactForPreview({
    artifactId: opts.artifactId,
    accessToken,
    previewToken,
  });
  if (!loaded) {
    return new Response("Not found", { status: 404 });
  }

  const path =
    opts.filePath && opts.filePath !== ""
      ? opts.filePath
      : loaded.entryPath || "index.html";

  return buildProjectFileResponse({
    files: loaded.files,
    requestPath: path,
    access: loaded.access,
    bridgeToken,
    networkDisabled,
  });
}

export { artifactToFiles };
