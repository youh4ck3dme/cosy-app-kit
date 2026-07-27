import type { RawNode } from "../semantic-intent/types";

export interface PWAUpdateGuardOptions {
  storageKey?: string;
}

export class PWAUpdateGuard {
  private storageKey: string;
  private memoryFallback: Map<string, string> = new Map();

  constructor(options: PWAUpdateGuardOptions = {}) {
    this.storageKey = options.storageKey || "pwa:backup:ast:v1";
  }

  private getStorage(): Storage | null {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage;
      }
      if (typeof localStorage !== "undefined") {
        return localStorage;
      }
    } catch {
      // Node 22+ throws when accessing localStorage without --localstorage-file
    }
    return null;
  }

  /**
   * Persists the current AST before contactless SW cache refresh (skipWaiting)
   */
  public async preserveASTBeforeRefresh(ast: RawNode[]): Promise<boolean> {
    try {
      const payload = JSON.stringify({
        timestamp: Date.now(),
        ast,
      });

      const storage = this.getStorage();
      if (storage) {
        storage.setItem(this.storageKey, payload);
      } else {
        this.memoryFallback.set(this.storageKey, payload);
      }
      return true;
    } catch (error) {
      console.warn("[PWAUpdateGuard] Failed to preserve AST state:", error);
      return false;
    }
  }

  /**
   * Restores preserved AST after SW update refresh
   */
  public getPreservedAST(): RawNode[] | null {
    try {
      const storage = this.getStorage();
      const raw = storage
        ? storage.getItem(this.storageKey)
        : this.memoryFallback.get(this.storageKey);

      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed.ast || null;
      }
      return null;
    } catch (error) {
      console.warn("[PWAUpdateGuard] Failed to restore preserved AST:", error);
      return null;
    }
  }

  /**
   * Clears saved backup after successful restoration
   */
  public clearPreservedAST(): void {
    const storage = this.getStorage();
    if (storage) {
      try {
        storage.removeItem(this.storageKey);
      } catch {
        // ignore
      }
    }
    this.memoryFallback.delete(this.storageKey);
  }

  /**
   * Registers Service Worker update listener with skipWaiting trigger
   */
  public registerServiceWorkerUpdateGuard(registration?: ServiceWorkerRegistration): void {
    if (!registration) return;

    registration.addEventListener("updatefound", () => {
      const installingWorker = registration.installing;
      if (!installingWorker) return;

      installingWorker.addEventListener("statechange", () => {
        if (installingWorker.state === "installed" && navigator.serviceWorker?.controller) {
          // New version available! Signal skipWaiting
          installingWorker.postMessage({ type: "SKIP_WAITING" });
        }
      });
    });
  }
}
