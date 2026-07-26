# Builder Kernel

Library path: `src/lib/builder/`  
Public API: `src/lib/builder/index.ts`  
Bootstrap: `bootstrapBuilderKernel()` in `src/lib/builder/kernel/kernelFacade.ts`

Release lineage: tags `v0.4.5-kernel-foundation`, `v0.4.5-kernel-foundation-audited`, `v0.4.5.1-hardening`.

## Purpose

Headless document engine for structured UI trees. Owns:

- the authoritative `BuilderDocument`
- command dispatch with snapshot rollback
- undo / redo history
- post-mutation structural invariants

Does **not** own product chat UI, artifact iframe preview, or a design Canvas editor.

## Core type: `BuilderKernel`

Key methods (see `kernel/builderKernel.ts`):

| Method                  | Behavior                                              |
| ----------------------- | ----------------------------------------------------- |
| `getDocument()`         | Deep clone — callers cannot alias kernel memory       |
| `getReadonlyDocument()` | Deep clone then deep-freeze                           |
| `loadDocument(input)`   | Zod-parse + replace document; clears history          |
| `dispatch(command)`     | Snapshot → execute → validate → history push          |
| `undo()` / `redo()`     | Exception-safe; restore on throw                      |
| `transaction(fn)`       | Batches via `TransactionContext`; nesting unsupported |
| `getHistory()`          | Read-only `HistoryView`                               |

## Session bootstrap

```ts
import { bootstrapBuilderKernel } from "@/lib/builder";

const session = bootstrapBuilderKernel();
// session.kernel, session.ui, session.eventBus,
// session.nodeRegistry, session.commandRegistry, session.pluginRegistry
```

Registers native node definitions by default (`registerNativeNodes !== false`).

## Module map

| Area             | Path                                 |
| ---------------- | ------------------------------------ |
| Document types   | `document/document.types.ts`         |
| Zod schemas      | `document/documentValidator.ts`      |
| Invariants       | `document/documentInvariants.ts`     |
| Commands         | `commands/`                          |
| History          | `history/historyManager.ts`          |
| Events           | `kernel/eventBus.ts`                 |
| Node registry    | `registry/`                          |
| Kernel plugins   | `plugins/`                           |
| IR               | `imports/ir/`                        |
| Canvas RPC types | `renderer/canvas/canvasRpc.types.ts` |

## What is shipped vs not

| Capability                       | Status                                                        |
| -------------------------------- | ------------------------------------------------------------- |
| Command architecture             | Implemented                                                   |
| Undo/redo with exception safety  | Implemented (v0.4.5.1)                                        |
| Document invariants              | Implemented                                                   |
| Kernel plugin isolation defaults | Implemented                                                   |
| Hardening regression tests       | Implemented                                                   |
| Design Canvas consumer           | Not yet implemented                                           |
| Product route integration        | Not yet implemented                                           |
| Persistence                      | Not yet implemented                                           |
| Diagnostics export               | Future milestone (see [OBSERVABILITY.md](./OBSERVABILITY.md)) |

## Tests

```bash
bun run test:unit src/lib/builder
```

Includes command, plugin, IR, adversarial, reality-check matrix, and hardening suites.

## Further reading

- [DOCUMENT_MODEL.md](./DOCUMENT_MODEL.md)
- [COMMAND_SYSTEM.md](./COMMAND_SYSTEM.md)
- [UNDO_REDO.md](./UNDO_REDO.md)
- [INVARIANTS.md](./INVARIANTS.md)
- [PLUGIN_ARCHITECTURE.md](./PLUGIN_ARCHITECTURE.md)
