# Plugin architecture (Builder Kernel)

Source: `src/lib/builder/plugins/`

This document describes the **kernel-integrated** plugin registry. For the isolated SDK foundation, see [PLUGIN_SDK.md](./PLUGIN_SDK.md). The two systems are **not wired together**.

## `PluginRegistry`

Constructed by `bootstrapBuilderKernel` with `NodeRegistry`, `CommandRegistry`, and `KernelEventBus`.

Plugins implement `BuilderPlugin`:

- `id`, `name`, `version`
- optional `permissions`
- `register(kernel: BuilderKernelFacade)`
- optional `nodes` definitions
- optional `onDestroy`

## Permissions

| Permission | Effect |
| --- | --- |
| `nodes.register` | Register node types |
| `nodes.overwrite` | Overwrite existing (including native) node types |
| `commands.register` | Register non-core command factories |
| `commands.overwrite` | Overwrite existing non-core commands |
| `events.subscribe` | Subscribe to kernel events |
| `document.read` | Declared (facade surface is registry/event oriented today) |
| `document.write` | Declared |

Defaults when omitted: `nodes.register`, `commands.register`, `events.subscribe`.

Native overwrite requires `nodes.overwrite`. Core command types are never overwriteable.

## Facade surface

`BuilderKernelFacade` exposes:

- `registerNode` / `registerCommand` (gated)
- read-only `nodeRegistry` / `commandRegistry` views
- subscribe-only `eventBus`

Live mutable registries and emit/clear on the event bus are not exposed.

## Unregister

`unregister(pluginId)` invokes `onDestroy` then removes the plugin.

## Tests

`src/lib/builder/pluginEngine.test.ts`.
