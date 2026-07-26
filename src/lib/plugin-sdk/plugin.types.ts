/** NEXIFY Forge Plugin SDK Foundation (v0.4.7). */

/** Declarative capability grants a plugin manifest can request. */
export const PLUGIN_PERMISSIONS = [
  "document.read",
  "document.write",
  "document.modify",
  "canvas.read",
  "canvas.modify",
] as const;

export type PluginPermission = (typeof PLUGIN_PERMISSIONS)[number];

export interface PluginManifest {
  name: string;
  version: string;
  description?: string;
  permissions: PluginPermission[];
}

export type PluginLifecycleHook = "onInstall" | "onEnable" | "onDisable" | "onDestroy";

export interface PluginLifecycleHandlers {
  onInstall?(context: PluginContext): void | Promise<void>;
  onEnable?(context: PluginContext): void | Promise<void>;
  onDisable?(context: PluginContext): void | Promise<void>;
  onDestroy?(context: PluginContext): void | Promise<void>;
}

export type PluginLifecycleState =
  | "registered"
  | "installed"
  | "enabled"
  | "disabled"
  | "destroyed";

/**
 * Sealed, permission-gated surface handed to plugin lifecycle hooks.
 * Deliberately excludes commandManager, document mutation methods, and any
 * internal registry — wiring real mutation capability through here is a
 * later milestone's job, not this foundation's.
 */
export interface PluginContext {
  readonly pluginId: string;
  readonly manifest: Readonly<PluginManifest>;
  hasPermission(permission: PluginPermission): boolean;
  /** Read-only snapshot, gated by the `document.read` permission. Undefined if ungranted or unavailable. */
  readDocument(): unknown;
  /** Read-only snapshot, gated by the `canvas.read` permission. Undefined if ungranted or unavailable. */
  readCanvas(): unknown;
}

export interface RegisteredPlugin {
  readonly manifest: PluginManifest;
  readonly handlers: PluginLifecycleHandlers;
  state: PluginLifecycleState;
}
