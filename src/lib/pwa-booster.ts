export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type PwaRuntimeStatus = {
  standalone: boolean;
  serviceWorker: boolean;
  installable: boolean;
  ios: boolean;
};

const WARM_PATHS = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
  "/offline.html",
] as const;

let deferredInstall: InstallPromptEvent | null = null;
let warmStarted = false;

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari home-screen launch
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const webkit = /WebKit/.test(ua);
  const notChrome = !/CriOS|FxiOS|EdgiOS/.test(ua);
  return iOS && webkit && notChrome;
}

export function getPwaRuntimeStatus(): PwaRuntimeStatus {
  return {
    standalone: isStandaloneDisplay(),
    serviceWorker: typeof navigator !== "undefined" && "serviceWorker" in navigator,
    installable: Boolean(deferredInstall),
    ios: isIosSafari(),
  };
}

/** Listen for Chromium install prompt; call once near app root. */
export function bindInstallPromptCapture() {
  if (typeof window === "undefined") return () => undefined;
  const onPrompt = (e: Event) => {
    e.preventDefault();
    deferredInstall = e as InstallPromptEvent;
    window.dispatchEvent(new CustomEvent("builder:pwa-installable"));
  };
  window.addEventListener("beforeinstallprompt", onPrompt);
  return () => {
    window.removeEventListener("beforeinstallprompt", onPrompt);
  };
}

export async function promptInstallApp(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferredInstall) return "unavailable";
  const prompt = deferredInstall;
  deferredInstall = null;
  await prompt.prompt();
  const { outcome } = await prompt.userChoice;
  return outcome;
}

/** Best-effort warm cache for icons/manifest (prod SW picks these up). */
export async function warmPwaAssets(): Promise<void> {
  if (warmStarted || typeof window === "undefined") return;
  warmStarted = true;
  await Promise.allSettled(
    WARM_PATHS.map((path) =>
      fetch(path, { cache: "force-cache", credentials: "same-origin" }).catch(() => undefined),
    ),
  );
}

export function resetPwaBoosterForTests() {
  deferredInstall = null;
  warmStarted = false;
}
