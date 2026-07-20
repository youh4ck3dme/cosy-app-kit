import { toast } from "sonner";

/**
 * Register the hand-rolled service worker (public/sw.js). PROD-only so dev
 * and preview sandboxes never fight a stale cache.
 */
export function registerServiceWorker() {
  if (!import.meta.env.PROD) return;
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      reg.addEventListener("updatefound", () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener("statechange", () => {
          // A waiting worker + an existing controller means a new version is ready.
          if (sw.state === "installed" && navigator.serviceWorker.controller) {
            toast("Update available", {
              description: "A new version of Builder is ready.",
              duration: 15_000,
              action: {
                label: "Reload",
                onClick: () => {
                  reg.waiting?.postMessage("SKIP_WAITING");
                  navigator.serviceWorker.addEventListener(
                    "controllerchange",
                    () => window.location.reload(),
                    { once: true },
                  );
                },
              },
            });
          }
        });
      });
    } catch {
      // Registration is best-effort; the app works fine without it.
    }
  });
}
