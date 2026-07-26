import { assertValidPluginManifest } from "./pluginManifest";
import { hasPermission } from "./pluginPermissions";
import { runDestroy, runDisable, runEnable, runInstall } from "./pluginLifecycle";
import type {
  PluginContext,
  PluginLifecycleHandlers,
  PluginManifest,
  PluginPermission,
  RegisteredPlugin,
} from "./plugin.types";

export interface PluginDocumentSource {
  read(): unknown;
}

export interface PluginCanvasSource {
  read(): unknown;
}

export interface PluginSdkOptions {
  /** Host-supplied read accessor — never a live kernel reference. Optional. */
  documentSource?: PluginDocumentSource;
  /** Host-supplied read accessor — never a live kernel reference. Optional. */
  canvasSource?: PluginCanvasSource;
}

export interface PluginMetadata {
  readonly manifest: PluginManifest;
  readonly state: RegisteredPlugin["state"];
}

/**
 * Isolated Plugin SDK registry (v0.4.7 foundation).
 * Holds manifests + lifecycle handlers only — never a live kernel reference,
 * command manager, or internal registry. Plugins only ever see a sealed
 * PluginContext built fresh per call, permission-gated at read time.
 */
export class PluginSdkRegistry {
  private plugins = new Map<string, RegisteredPlugin>();

  constructor(private readonly options: PluginSdkOptions = {}) {}

  private createContext(plugin: RegisteredPlugin): PluginContext {
    // Independent frozen grant list — never alias a mutable caller array.
    const granted: readonly PluginPermission[] = Object.freeze([
      ...plugin.manifest.permissions,
    ]);
    const manifestSnapshot: PluginManifest = Object.freeze({
      name: plugin.manifest.name,
      version: plugin.manifest.version,
      ...(plugin.manifest.description !== undefined
        ? { description: plugin.manifest.description }
        : {}),
      permissions: granted,
    });

    return Object.freeze({
      pluginId: plugin.manifest.name,
      manifest: manifestSnapshot,
      hasPermission: (permission: PluginPermission) => hasPermission(granted, permission),
      readDocument: () =>
        hasPermission(granted, "document.read")
          ? this.options.documentSource?.read()
          : undefined,
      readCanvas: () =>
        hasPermission(granted, "canvas.read")
          ? this.options.canvasSource?.read()
          : undefined,
    });
  }

  private require(pluginId: string): RegisteredPlugin {
    const entry = this.plugins.get(pluginId);
    if (!entry) {
      throw new Error(`Unknown plugin: ${pluginId}`);
    }
    return entry;
  }

  private toMetadata(entry: RegisteredPlugin): PluginMetadata {
    return { manifest: entry.manifest, state: entry.state };
  }

  register(manifestInput: unknown, handlers: PluginLifecycleHandlers = {}): PluginMetadata {
    const manifest = assertValidPluginManifest(manifestInput);
    if (this.plugins.has(manifest.name)) {
      throw new Error(`Plugin already registered: ${manifest.name}`);
    }
    const entry: RegisteredPlugin = { manifest, handlers, state: "registered" };
    this.plugins.set(manifest.name, entry);
    return this.toMetadata(entry);
  }

  /**
   * Removes a plugin's registry entry. Requires the plugin to already be
   * destroyed (or never installed) — call `destroy()` first for anything
   * that reached "installed"/"enabled"/"disabled", so `onDestroy()` always
   * runs before bookkeeping is dropped. Silently bypassing teardown here
   * would leak whatever a plugin's own lifecycle hooks were responsible for
   * releasing.
   */
  remove(pluginId: string): void {
    const entry = this.require(pluginId);
    if (entry.state !== "registered" && entry.state !== "destroyed") {
      throw new Error(
        `Cannot remove plugin "${pluginId}" while in state "${entry.state}" — call destroy() first.`,
      );
    }
    this.plugins.delete(pluginId);
  }

  get(pluginId: string): PluginMetadata | undefined {
    const entry = this.plugins.get(pluginId);
    return entry ? this.toMetadata(entry) : undefined;
  }

  list(): PluginMetadata[] {
    return [...this.plugins.values()].map((entry) => this.toMetadata(entry));
  }

  async install(pluginId: string): Promise<PluginMetadata> {
    const entry = this.require(pluginId);
    entry.state = await runInstall(entry.handlers, this.createContext(entry), entry.state);
    return this.toMetadata(entry);
  }

  async enable(pluginId: string): Promise<PluginMetadata> {
    const entry = this.require(pluginId);
    entry.state = await runEnable(entry.handlers, this.createContext(entry), entry.state);
    return this.toMetadata(entry);
  }

  async disable(pluginId: string): Promise<PluginMetadata> {
    const entry = this.require(pluginId);
    entry.state = await runDisable(entry.handlers, this.createContext(entry), entry.state);
    return this.toMetadata(entry);
  }

  async destroy(pluginId: string): Promise<PluginMetadata> {
    const entry = this.require(pluginId);
    entry.state = await runDestroy(entry.handlers, this.createContext(entry), entry.state);
    return this.toMetadata(entry);
  }
}
