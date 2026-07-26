# Command system

Source: `src/lib/builder/commands/`

## Contract: `ICommand`

```ts
interface ICommand<TPayload = unknown> {
  readonly id: string;
  readonly type: string;
  readonly timestamp: number;
  readonly payload: TPayload;
  execute(document: BuilderDocument): CommandResult;
  undo(document: BuilderDocument): CommandResult;
  serialize(): SerializedCommand<TPayload>;
}
```

`CommandResult`: `{ success, mutatedNodeIds, error?, metadata? }`.

Serialized commands carry durable `inverse` material for cold undo where applicable.

## Built-in commands

| Type | Class | File |
| --- | --- | --- |
| `ADD_NODE` | `AddNodeCommand` | `impl/addNode.command.ts` |
| `REMOVE_NODE` | `RemoveNodeCommand` | `impl/removeNode.command.ts` |
| `UPDATE_PROPERTY` | `UpdatePropertyCommand` | `impl/updateProperty.command.ts` |
| `MOVE_NODE` | `MoveNodeCommand` | `impl/moveNode.command.ts` |
| `BATCH` | `BatchCommand` | `impl/batch.command.ts` |

These five are **core command types** (`CORE_COMMAND_TYPES`). Kernel plugins cannot register or overwrite them.

## Registry

`CommandRegistry` / `createDefaultCommandRegistry` / `globalCommandRegistry` in `commandManager.ts`.

Zod schemas for payloads live in `commandSchemas.ts`.

## Dispatch semantics (kernel)

1. Reject nested `dispatch` while inside `transaction` (use `TransactionContext.dispatch`).
2. Snapshot-clone current document.
3. `command.execute` — on throw or `success: false`, restore snapshot.
4. `validateDocument` — on failure, restore snapshot.
5. Bump metadata version/timestamp; push history entry.

Commands must not assume they can partially mutate and leave the kernel dirty; the kernel restores on failure.

## Creating a custom command (library pattern)

1. Implement `ICommand` with `execute`, `undo`, `serialize`.
2. Register a factory on `CommandRegistry` under a **non-core** type string.
3. Prefer JSON-serializable payloads and durable `inverse` data.
4. Cover with Vitest using `BuilderKernel.dispatch`.

Runnable sketch: [`examples/basic-command/`](../examples/basic-command/).

## IR path

`IRToCommandCompiler` maps Universal Design IR nodes into command sequences. Import **adapters** (vision/html/figma) are **Not yet implemented**.
