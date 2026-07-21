export type AppPreferences = {
  /** Lock document scroll — native iPhone shell feel (default on). */
  nativeShellLock: boolean;
  /** Tactile feedback on key actions. */
  hapticsEnabled: boolean;
  /** Skip decorative motion for snappier UI. */
  speedMode: boolean;
  /** Warm SW cache + prefetch PWA assets on launch. */
  pwaBooster: boolean;
};

const STORAGE_KEY = "builder:app-preferences";
const CHANGE_EVENT = "builder:app-preferences-change";

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  nativeShellLock: true,
  hapticsEnabled: true,
  speedMode: false,
  pwaBooster: true,
};

function mergePreferences(raw: Partial<AppPreferences> | null | undefined): AppPreferences {
  return { ...DEFAULT_APP_PREFERENCES, ...(raw ?? {}) };
}

export function getAppPreferences(): AppPreferences {
  if (typeof localStorage === "undefined") return DEFAULT_APP_PREFERENCES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_APP_PREFERENCES;
    return mergePreferences(JSON.parse(raw) as Partial<AppPreferences>);
  } catch {
    return DEFAULT_APP_PREFERENCES;
  }
}

export function setAppPreferences(patch: Partial<AppPreferences>): AppPreferences {
  const next = mergePreferences({ ...getAppPreferences(), ...patch });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private mode — still apply for this session via event listeners.
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: next }));
  }
  return next;
}

export function subscribeAppPreferences(listener: (prefs: AppPreferences) => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const onChange = (e: Event) => {
    const detail = (e as CustomEvent<AppPreferences>).detail;
    listener(detail ?? getAppPreferences());
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener(getAppPreferences());
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** Sync `data-speed` on <html> for CSS that skips decorative motion. */
export function syncSpeedModeDom(speedMode: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.toggleAttribute("data-speed", speedMode);
}
