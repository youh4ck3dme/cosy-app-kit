export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type PwaRuntimeStatus = {
  standalone: boolean;
  serviceWorker: boolean;
  installable: boolean;
  ios: boolean;
  pushSupported: boolean;
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
let isAppInstalled = false;

/**
 * Vercel Deployment Protection on `*.vercel.app` previews redirects static
 * assets through `vercel.com/sso-api`, which fails CORS for warm fetch.
 * Skip warming there; test PWA on the unprotected production host instead.
 */
export function shouldWarmPwaAssets(
  hostname = typeof window !== "undefined" ? window.location.hostname : "",
): boolean {
  if (!hostname) return false;
  return !hostname.endsWith(".vercel.app");
}

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

export function isPushNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;
}

export function getPwaRuntimeStatus(): PwaRuntimeStatus {
  return {
    standalone: isStandaloneDisplay(),
    serviceWorker: typeof navigator !== "undefined" && "serviceWorker" in navigator,
    installable: Boolean(deferredInstall),
    ios: isIosSafari(),
    pushSupported: isPushNotificationSupported(),
  };
}

/** Listen for Chromium install prompt and appinstalled events; call once near app root. */
export function bindInstallPromptCapture() {
  if (typeof window === "undefined") return () => undefined;

  const onPrompt = (e: Event) => {
    e.preventDefault();
    deferredInstall = e as InstallPromptEvent;
    window.dispatchEvent(new CustomEvent("builder:pwa-installable"));
  };

  const onAppInstalled = () => {
    isAppInstalled = true;
    deferredInstall = null;
    console.info("[PWA] App successfully installed to device home screen/app launcher");
    window.dispatchEvent(new CustomEvent("builder:pwa-installed"));
  };

  window.addEventListener("beforeinstallprompt", onPrompt);
  window.addEventListener("appinstalled", onAppInstalled);

  // Setup Web Launch Queue for handling deep linked files / URLs
  setupLaunchQueueConsumer();

  return () => {
    window.removeEventListener("beforeinstallprompt", onPrompt);
    window.removeEventListener("appinstalled", onAppInstalled);
  };
}

/** Handle deep links and file launches via PWA Launch Queue API */
export function setupLaunchQueueConsumer(onLaunch?: (targetUrl: string) => void) {
  if (typeof window === "undefined") return;

  if (
    "launchQueue" in window &&
    (
      window as unknown as {
        launchQueue: { setConsumer: (cb: (params: { targetURL?: string }) => void) => void };
      }
    ).launchQueue
  ) {
    (
      window as unknown as {
        launchQueue: { setConsumer: (cb: (params: { targetURL?: string }) => void) => void };
      }
    ).launchQueue.setConsumer((launchParams) => {
      if (launchParams.targetURL) {
        console.info("[PWA LaunchQueue] Handled launch target URL:", launchParams.targetURL);
        if (onLaunch) onLaunch(launchParams.targetURL);
      }
    });
  }
}

export async function promptInstallApp(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferredInstall) return "unavailable";
  const prompt = deferredInstall;
  deferredInstall = null;
  await prompt.prompt();
  const { outcome } = await prompt.userChoice;
  if (outcome === "accepted") {
    isAppInstalled = true;
  }
  return outcome;
}

/** Opt-in Push Notification Permission Requester */
export async function requestPushNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushNotificationSupported()) return "denied";
  if (Notification.permission === "granted") return "granted";
  return await Notification.requestPermission();
}

/** Best-effort warm cache for icons/manifest (prod SW picks these up). */
export async function warmPwaAssets(): Promise<void> {
  if (warmStarted || typeof window === "undefined") return;
  if (!shouldWarmPwaAssets(window.location.hostname)) {
    warmStarted = true;
    return;
  }
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
  isAppInstalled = false;
}
