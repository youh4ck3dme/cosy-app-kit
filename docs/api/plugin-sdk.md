# API: Plugin SDK

Import from `@/lib/plugin-sdk` (barrel: `src/lib/plugin-sdk/index.ts`).

## Types

- `PLUGIN_PERMISSIONS`, `PluginPermission`
- `PluginManifest`, `PluginContext`, `PluginLifecycleHandlers`, `PluginLifecycleState`
- `RegisteredPlugin`

## Manifest / permissions

- `PluginManifestSchema`, `validatePluginManifest`, `assertValidPluginManifest`, `freezePluginManifest`
- `PluginPermissionSchema`, `validatePermissions`, `isValidPermission`, `hasPermission`

## Lifecycle

- `runInstall`, `runEnable`, `runDisable`, `runDestroy`
- `PluginLifecycleError`

## Registry

- `PluginSdkRegistry`
- `PluginSdkOptions`, `PluginDocumentSource`, `PluginCanvasSource`, `PluginMetadata`

Full list: read `src/lib/plugin-sdk/index.ts`.
