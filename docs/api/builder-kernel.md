# API: Builder Kernel

Import from `@/lib/builder` (barrel: `src/lib/builder/index.ts`).

## Kernel

- `BuilderKernel`
- `BuilderUiState`
- `createBuilderSession`
- `bootstrapBuilderKernel`
- Types: `KernelDispatchResult`, `TransactionContext`, `BootstrappedKernel`, `KernelBootstrapOptions`

## Document

- Types: `BuilderDocument`, `BuilderNode`, `NodeId`, …
- `DOCUMENT_SCHEMA_VERSION`
- `parseBuilderDocument`, `safeParseBuilderDocument`, schemas
- `validateDocument`, `assertValidDocument`
- `cloneDocument`, `deepFreeze`
- Factories: `createDefaultDocument`, …

## Commands

- `ICommand`, `CommandResult`, `SerializedCommand`
- `AddNodeCommand`, `RemoveNodeCommand`, `UpdatePropertyCommand`, `MoveNodeCommand`, `BatchCommand`
- `CommandRegistry`, `createDefaultCommandRegistry`, `globalCommandRegistry`

## History / events

- `HistoryManager`, `createHistoryEntry`, `HistoryEntry`, `HistoryView`, …
- `KernelEventBus`, `globalEventBus`

## Registry / plugins / IR

- `NodeRegistry`, `nativeNodeDefinitions`, registry types
- `PluginRegistry`, plugin types, `CORE_COMMAND_TYPES`
- IR types + `IRToCommandCompiler`
- Canvas RPC types only: `CANVAS_SANDBOX_ATTR`, `CanvasRpcMessage*`

Full list: read `src/lib/builder/index.ts`.
