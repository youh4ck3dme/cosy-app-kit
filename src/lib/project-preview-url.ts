/** Build iframe URL for multi-file project preview. */
export function buildProjectPreviewUrl(opts: {
  artifactId: string;
  entryPath: string;
  token?: string | null;
  bridgeToken?: string | null;
  networkDisabled?: boolean;
}): string {
  const entry = (opts.entryPath || "index.html").replace(/^\.\//, "");
  const qs = new URLSearchParams();
  if (opts.bridgeToken) qs.set("bt", opts.bridgeToken);
  if (opts.networkDisabled) qs.set("net", "0");
  const q = qs.toString();
  const suffix = q ? `?${q}` : "";

  if (opts.token) {
    return `/preview/${opts.artifactId}/~/${encodeURIComponent(opts.token)}/${entry}${suffix}`;
  }
  return `/preview/${opts.artifactId}/${entry}${suffix}`;
}
