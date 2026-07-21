import { PUBLISHED_ORIGIN } from "@/integrations/lovable";

/** Public share path for an artifact HTML page. */
export function publicArtifactPath(artifactId: string): string {
  return `/a/${artifactId}`;
}

export function publicEmbedPath(artifactId: string): string {
  return `/a/${artifactId}/embed`;
}

/**
 * Absolute URL for published HTML.
 * - On localhost/LAN → prefer production host so the link works for others
 *   (requires Lovable/prod secrets pointing at the same Supabase).
 * - On a real deploy → use current origin.
 */
export function publicArtifactUrl(
  artifactId: string,
  opts?: { preferProduction?: boolean; origin?: string },
): string {
  const path = publicArtifactPath(artifactId);
  const preferProd = opts?.preferProduction !== false;
  const origin =
    opts?.origin ?? (typeof window !== "undefined" ? window.location.origin : PUBLISHED_ORIGIN);

  try {
    const host = new URL(origin).hostname.toLowerCase();
    const isLocal =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      /^192\.168\./.test(host) ||
      /^10\./.test(host);
    if (preferProd && isLocal) return `${PUBLISHED_ORIGIN}${path}`;
  } catch {
    /* ignore */
  }
  return `${origin.replace(/\/$/, "")}${path}`;
}

export function publicEmbedUrl(
  artifactId: string,
  opts?: { preferProduction?: boolean; origin?: string },
): string {
  const page = publicArtifactUrl(artifactId, opts);
  return page.endsWith("/embed") ? page : `${page}/embed`;
}
