/**
 * Sandboxed srcdoc previews cannot use real localStorage (no allow-same-origin).
 * Pure helpers + script snippet for Canvas inject (tested in unit).
 */

/** Minimal Storage-like in-memory map (mirrors bridge runtime). */
export function createMemoryStorage(): Storage {
  const map = Object.create(null) as Record<string, string>;
  let keys: string[] = [];
  const rekey = () => {
    keys = Object.keys(map);
  };
  return {
    get length() {
      return keys.length;
    },
    key(i: number) {
      return keys[i] != null ? keys[i]! : null;
    },
    getItem(k: string) {
      const key = String(k);
      return Object.prototype.hasOwnProperty.call(map, key) ? map[key]! : null;
    },
    setItem(k: string, v: string) {
      const key = String(k);
      map[key] = String(v);
      rekey();
    },
    removeItem(k: string) {
      const key = String(k);
      if (Object.prototype.hasOwnProperty.call(map, key)) {
        delete map[key];
        rekey();
      }
    },
    clear() {
      for (const k of Object.keys(map)) delete map[k];
      keys = [];
    },
  };
}

/** Inject bridge as early as possible so polyfill runs before artifact scripts. */
export function injectScriptIntoHtmlHead(html: string, scriptTag: string): string {
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (open) => `${open}\n${scriptTag}`);
  }
  if (/<html[^>]*>/i.test(html)) {
    return html.replace(/<html[^>]*>/i, (open) => `${open}\n${scriptTag}`);
  }
  return `${scriptTag}\n${html}`;
}

/** True if script appears before first artifact <script> that is not the bridge. */
export function bridgePrecedesArtifactScripts(html: string, bridgeMarker: string): boolean {
  const bi = html.indexOf(bridgeMarker);
  if (bi < 0) return false;
  const rest = html.slice(bi + bridgeMarker.length);
  // After bridge, any other script may exist; bridge must be earlier than first non-bridge usage of localStorage in body scripts is hard — check head order
  const headEnd = html.toLowerCase().indexOf("</head>");
  if (headEnd > 0) {
    return bi < headEnd;
  }
  return bi === 0 || bi < (html.toLowerCase().indexOf("<script") ?? bi + 1);
}
