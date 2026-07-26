export {
  PLUGIN_PERMISSIONS,
  type PluginContext,
  type PluginLifecycleHandlers,
  type PluginLifecycleHook,
  type PluginLifecycleState,
  type PluginManifest,
  type PluginPermission,
  type RegisteredPlugin,
} from "./plugin.types";

export {
  assertValidPluginManifest,
  type ManifestValidationResult,
  PluginManifestSchema,
  validatePluginManifest,
} from "./pluginManifest";

export {
  hasPermission,
  isValidPermission,
  PluginPermissionSchema,
  validatePermissions,
} from "./pluginPermissions";

export {
  PluginLifecycleError,
  runDestroy,
  runDisable,
  runEnable,
  runInstall,
} from "./pluginLifecycle";

export {
  type PluginCanvasSource,
  type PluginDocumentSource,
  type PluginMetadata,
  PluginSdkRegistry,
  type PluginSdkOptions,
} from "./pluginRegistry";
