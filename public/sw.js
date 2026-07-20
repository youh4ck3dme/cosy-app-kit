/* Builder service worker — hand-rolled on purpose:
 * the Lovable Vite wrapper does not tolerate extra build plugins (no vite-plugin-pwa),
 * and hashed asset names make precaching impractical without a build manifest.
 * Strategy:
 *   - navigations: network-first, offline.html fallback
 *   - same-origin static assets (/assets/, fonts, icons): stale-while-revalidate
 *   - never touch /api/, cross-origin (Supabase, Mistral), or non-GET requests
 */
const CACHE = "builder-v1";
const PRECACHE = ["/offline.html", "/manifest.webmanifest", "/favicon.ico"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/mcp")) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("/offline.html").then((r) => r ?? Response.error())),
    );
    return;
  }

  const isStatic =
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(css|js|woff2?|png|svg|ico|webmanifest)$/.test(url.pathname);
  if (!isStatic) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const refresh = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached ?? Response.error());
      return cached ?? refresh;
    }),
  );
});
