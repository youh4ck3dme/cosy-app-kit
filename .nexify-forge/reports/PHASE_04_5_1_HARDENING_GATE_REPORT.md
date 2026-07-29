# PHASE 04.5.1 HARDENING GATE REPORT

**Document type:** Pre-implementation diagnostic (no code changes)  
**Kernel commit baseline:** `349aec1` — `feat(nexify-forge): phase 04.5 builder kernel`  
**Prior forensic:** `.nexify-forge/reports/BUILDER_KERNEL_FORENSIC_AUDIT.md`  
**Scope:** `src/lib/builder/**` only  
**Purpose:** Prevent partial / unordered hardening before Phase 05 Canvas

---

## Executive verdict

The Builder Kernel is a **valid headless skeleton** with real commands, history entries, IR→command compilation, and narrow happy-path tests.

It is **not sealed**. Mutation, undo serialization, graph validation, transactions, and plugin trust are incomplete.

**Architecture readiness score: 48 / 100** for Canvas / production consumers.

**Final decision — CANVAS: NO**

**Reason:** Writable document escape hatch, non-replayable undo, missing `kernel.transaction()` + BATCH registry, and unvalidated graphs will make Canvas bugs indistinguishable from kernel corruption.

Phase 04.5.1 must close the blockers below in the listed order. Do not start Canvas, Vision runtime, or Marketplace until Architecture Sign-off after 04.5.1.

---

## Architecture readiness score

| Area                        |  Score | Gate status                   |
| --------------------------- | -----: | ----------------------------- |
| Document mutability model   |     25 | BLOCKER                       |
| Command engine integrity    |     55 | BLOCKER                       |
| History / replay durability |     35 | BLOCKER                       |
| Graph consistency           |     30 | BLOCKER                       |
| Transaction system          |     40 | BLOCKER (`BatchCommand` only) |
| Serialization / AI / collab |     35 | BLOCKER                       |
| Plugin security             |     20 | BLOCKER (min skeleton)        |
| Performance headroom        |     70 | WARN (cap history in 04.5.1)  |
| Test evidence               |     45 | BLOCKER (must expand)         |
| **Overall**                 | **48** | **NO-GO for Canvas**          |

---

## Current blockers (must fix before Canvas)

1. **C1** — `getDocument()` exposes live mutable `BuilderDocument`
2. **C2** — `ADD_NODE.undo` can orphan children
3. **C3** — Undo snapshots / previous values not in serialized command JSON
4. **C4** — `loadDocument` / Zod accept invalid graphs
5. **H1** — No `kernel.transaction()`
6. **H2** — `BATCH` missing from `CommandRegistry` / deserialize
7. **H3** — Plugin API has no permission boundary (overwrite + command inject)

---

## Must fix before Canvas (acceptance summary)

| ID  | Acceptance criteria (observable)                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| C1  | External assignment via returned document reference cannot mutate kernel state; mutations only succeed through `dispatch` / `transaction`        |
| C2  | Undoing `ADD_NODE` either refuses when children exist, or removes entire subtree atomically and restores on redo                                 |
| C3  | `serialize → JSON → registry.create → execute/undo` round-trip works for ADD/REMOVE/MOVE/UPDATE/BATCH without private instance fields            |
| C4  | `validateDocument(doc)` rejects `ROOT_MISSING`, `ORPHAN_NODE`, `CYCLE_FOUND`, `INVALID_PARENT_REFERENCE`, `DUPLICATE_CHILD`, `DANGLING_CHILD_ID` |
| H1  | `kernel.transaction(fn \| ICommand[])` commits all or rolls back all; one `HistoryEntry`                                                         |
| H2  | `"BATCH"` registered; nested commands deserialize recursively                                                                                    |
| H3  | Plugin manifest permissions enforced; native node overwrite denied by default                                                                    |

---

# AUDIT AREA 1 — DOCUMENT MUTABILITY MODEL

### Exposures (source truth)

| API / path                             | Writable?                            | Evidence                              |
| -------------------------------------- | ------------------------------------ | ------------------------------------- |
| `BuilderKernel.getDocument()`          | **Yes — live ref**                   | `return this.document`                |
| `BuilderKernel.getHistory()`           | Yes — live `HistoryManager`          | stacks are private but methods mutate |
| `bootstrapBuilderKernel().history`     | Same                                 | facade returns `kernel.getHistory()`  |
| `getNode(document, id)`                | Returns live node                    | `nodes/nodeGraph.ts`                  |
| `walkNodeIds` / `collectDescendantIds` | Read-only helpers, but take live doc |                                       |
| Public export of types + factories     | Callers can build docs and pass in   | `index.ts`                            |
| Command `execute/undo`                 | Mutate in place                      | all `impl/*`                          |

### Answers

1. **Can external code mutate without commands?** **YES.**  
   `kernel.getDocument().tree.nodes[id].props.x = 1` bypasses history/events.
2. **Can history become inconsistent?** **YES.** External edits are invisible to undo; undo of a later command cannot restore the external edit; graph can diverge from command log.
3. **Exact API changes required (design only):**
   - Replace `getDocument(): BuilderDocument` with `getDocument(): ReadonlyDeep<BuilderDocument>` **and** enforce via `structuredClone` snapshot **or** runtime freeze in dev + Proxy deny-sets in prod.
   - Add `exportDocument(): BuilderDocument` (deep clone) for persistence.
   - Optionally `inspectNode(id): ReadonlyDeep<BuilderNode> | undefined`.
   - Keep internal `private document` writable only inside kernel command application.
   - Deep-clone node payloads on `ADD_NODE` so caller cannot alias `props`/`style`.

### Risk card

|                         |                                                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Current risk**        | Silent corruption; Canvas/AI cannot trust document as command-sourced                                           |
| **Severity**            | CRITICAL                                                                                                        |
| **Required fix**        | Seal read API + deep-clone on ingest + command-only writes                                                      |
| **Acceptance criteria** | Unit test: mutate returned object → kernel document unchanged; only `dispatch` changes state and pushes history |

---

# AUDIT AREA 2 — COMMAND ENGINE INTEGRITY

### Reconstruct-from-JSON matrix

| Command           | `serialize()` payload               | Hidden instance state             | `fromSerialized` / registry | Round-trip execute | Round-trip undo                     |
| ----------------- | ----------------------------------- | --------------------------------- | --------------------------- | ------------------ | ----------------------------------- |
| `ADD_NODE`        | full `node` + `parentId` + `index?` | none for undo (inverse is delete) | YES                         | YES (if ids fixed) | **PARTIAL** — orphans children (C2) |
| `REMOVE_NODE`     | `{ nodeId }` only                   | **`snapshot` subtree**            | YES factory                 | YES                | **NO** after deserialize            |
| `MOVE_NODE`       | `{ nodeId, newParentId, index? }`   | **`snapshot` prev parent/index**  | YES                         | YES                | **NO** after deserialize            |
| `UPDATE_PROPERTY` | `{ nodeId, path, value }`           | **`previousValue`**               | YES                         | YES                | **NO** after deserialize            |
| `BATCH`           | `{ count, commands[] }`             | **`executed[]` live cmds**        | **NO registry**             | manual only        | **NO** durable                      |

### Determinism notes

- `Date.now()` / `crypto.randomUUID()` used when ids/timestamps omitted → non-deterministic identity unless caller supplies ids (IR compiler usually supplies ids).
- Shallow copy on ADD shares nested object identity with caller → non-command mutation risk.
- `CommandRegistry.create` uses unchecked `as SerializedCommand<…>` casts — **no Zod per command type**.

### Missing pieces for target architecture

```text
SerializedCommand → CommandFactory → ICommand → Execution
```

Gaps:

1. Payload Zod schemas per command type.
2. Inverse / before-state embedded in serialized form (or event-sourced model).
3. `BATCH` factory + nested reconstruction.
4. Kernel method `dispatchSerialized(json)` for AI/cloud replay.

---

# AUDIT AREA 3 — HISTORY ENGINE

### What exists

- `HistoryEntry`: `{ id, timestamp, commandType, serialized, mutatedNodeIds, command }`
- Undo/redo stacks in memory
- `exportSerialized()` returns forward command payloads only (no inverse)

### Survive matrix

| Scenario           | Survives today?                                                                                                         |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Browser refresh    | **NO** — no persistence adapter; undo state lost                                                                        |
| Server persistence | **NO** — no adapter; serialized undo incomplete                                                                         |
| AI replay          | **PARTIAL** — can re-`execute` ADD/UPDATE/MOVE/REMOVE from empty base if starting snapshot known; cannot undo from JSON |
| Collaboration sync | **NO** — no vector clocks / OT / CRDT; live mutation model                                                              |

### Required durable record (design contract for 04.5.1)

Each history event MUST store at minimum:

```text
{
  id: string
  type: string
  timestamp: number
  actor?: { userId?: string; source: "user"|"ai"|"import"|"system" }
  payload: <command-specific>
  inverse: <enough to undo without private fields>
  baseDocumentVersion: number
  mutatedNodeIds: string[]
}
```

**Inverse strategies (pick one consistently):**

| Strategy                      | Pros         | Cons             |
| ----------------------------- | ------------ | ---------------- |
| A. Store `beforePatch` JSON   | Simple undo  | Larger history   |
| B. Store inverse command      | Compact      | Harder for BATCH |
| C. Document snapshots every N | Fast restore | Memory / disk    |

**Recommendation for 04.5.1:** Strategy A for UPDATE/MOVE/REMOVE; ADD inverse = REMOVE by id (with subtree policy); BATCH = ordered list of inverses.

---

# AUDIT AREA 4 — GRAPH CONSISTENCY ENGINE

### Corruption scenarios (possible today)

| Scenario                | How                                                              |
| ----------------------- | ---------------------------------------------------------------- |
| Orphan node             | `ADD_NODE.undo` after children added; or load crafted JSON       |
| Cycle                   | Load crafted `parentId` cycle (MOVE blocks some live cycles)     |
| Duplicate logical child | Children array can list same id twice if mutated externally      |
| Missing root            | Blocked by parse if `rootId` absent from map                     |
| Invalid parent ref      | Child `parentId` ≠ parent’s `children` — accepted by Zod         |
| Dangling child id       | `children` points to missing node — accepted by Zod              |
| Duplicate node keys     | Impossible in one `Record` key; duplicate ids across meaning N/A |

### Required `validateDocument(document)` codes

```text
ROOT_MISSING
ROOT_HAS_PARENT
ORPHAN_NODE
DANGLING_CHILD_ID
INVALID_PARENT_REFERENCE
PARENT_CHILD_ASYMMETRY
CYCLE_FOUND
DUPLICATE_CHILD_ENTRY
EMPTY_NODE_ID
UNKNOWN_BREAKPOINT_SHAPE  (optional)
```

### When to run

1. After `parseBuilderDocument` / `loadDocument`
2. After every successful `dispatch` / `undo` / `redo` / `transaction` commit (dev always; prod sample or always until perf proven)
3. Before `exportDocument`

---

# AUDIT AREA 5 — TRANSACTION SYSTEM

### Current state

- `BatchCommand` implements all-or-nothing via nested undo on failure.
- **No** `kernel.transaction(...)`.
- BATCH not registry-replayable.

### Required API (design)

```ts
// Preferred for AI / Vision
kernel.transaction(commands: ICommand[]): KernelDispatchResult

// Optional ergonomic wrapper
kernel.transaction((tx) => {
  tx.dispatch(new AddNodeCommand(...))
  tx.dispatch(new UpdatePropertyCommand(...))
})
```

### Semantics

| Rule                | Spec                                                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Atomic commit       | All nested execute succeed → one `HistoryEntry` (`BATCH`)                                                                                         |
| Rollback            | On first failure, undo already-executed nested commands in reverse                                                                                |
| Events              | Emit single `COMMAND_EXECUTED` for BATCH (not N nested), or emit nested + batch — **choose one**; recommend single batch event + `metadata.count` |
| Nested transactions | **Forbid in 04.5.1** (throw `TRANSACTION_NESTING_UNSUPPORTED`)                                                                                    |
| Failure recovery    | Return `{ success:false, error }`; document unchanged vs pre-tx                                                                                   |
| Isolation           | No external reads should observe mid-tx state (if sync JS, OK if no await mid-tx)                                                                 |

### Rollback strategy

Reuse `BatchCommand` internals; kernel method constructs `BatchCommand` and `dispatch`s it. Register `"BATCH"` with recursive deserialize.

---

# AUDIT AREA 6 — SERIALIZATION / REPLAY ARCHITECTURE

### Target

```text
JSON Event Log
      │
Command Registry (+ Zod)
      │
Command Factory
      │
Kernel Execution
```

### Consumer flows

| Consumer    | Needs                                                                         |
| ----------- | ----------------------------------------------------------------------------- |
| AI          | Emit allowlisted `SerializedCommand[]`; kernel validates + `transaction`      |
| Cloud save  | Persist `exportDocument()` + append-only event log with inverses              |
| Multiplayer | Later: ordered ops with actor ids; **out of 04.5.1** beyond event shape stubs |

### Missing pieces now

1. Per-command Zod schemas
2. Inverse in serialized events
3. `dispatchSerialized` / `replay(events, baseDocument)`
4. BATCH registry
5. Actor/source metadata on `HistoryEntry`
6. Document version monotonic check on replay

### AI generation safety (min for 04.5.1)

- Reject unknown command types
- Reject paths outside allowlist for `UPDATE_PROPERTY`
- Reject ADD of unknown `node.type` unless plugin permitted
- Always apply Vision IR via `transaction(compiler.compile(...))`

---

# AUDIT AREA 7 — PLUGIN SECURITY MODEL

### Current trust boundary

```text
Plugin.register(facade)
  → registerNode (overwrite warned only)
  → registerCommand (any type)
  → eventBus (full)
  → nodeRegistry / commandRegistry direct refs
```

`unregister` does **not** remove nodes/commands already injected.

### Malicious plugin capabilities today

| Action                             | Possible?                                                  |
| ---------------------------------- | ---------------------------------------------------------- |
| Overwrite core nodes (`Button`, …) | **YES**                                                    |
| Replace command factories          | **YES**                                                    |
| Corrupt documents                  | **YES** (via custom commands or if given doc access later) |
| Subscribe to all events            | **YES**                                                    |

### Minimum permission model (04.5.1 skeleton)

```ts
type PluginPermission =
  | "nodes.register"
  | "nodes.overwrite" // default DENY for native types
  | "commands.register"
  | "commands.overwrite" // default DENY for built-ins
  | "events.subscribe"
  | "document.read" // via sealed API only
  | "document.write"; // only through dispatch — rarely granted
```

```ts
interface PluginManifest {
  id: string;
  version: string;
  permissions: PluginPermission[];
  capabilities?: string[];
}
```

Enforce at facade methods; deny by default; never hand raw writable document to plugins in 04.5.1.

---

# AUDIT AREA 8 — PERFORMANCE LIMITS

|   Scale | Lookup | Single cmd | Large REMOVE snapshot | Unbounded undo | Verdict                       |
| ------: | ------ | ---------- | --------------------- | -------------- | ----------------------------- |
|     100 | OK     | OK         | OK                    | OK             | Fine                          |
|   1 000 | OK     | OK         | Noticeable            | Watch          | Cap history                   |
|  10 000 | OK     | OK         | Expensive clones      | Risk           | Need compaction               |
| 100 000 | OK map | OK         | Severe                | Fail           | Out of scope without redesign |

### Expensive ops today

1. `structuredClone` entire subtree on REMOVE
2. Unbounded undo/redo stacks
3. Full-document Zod parse on load (OK) + missing invariant walk O(n) once added
4. History holding live `ICommand` instances + cloned snapshots

### 04.5.1 performance minimum

- `maxHistoryEntries` (e.g. 100) with drop-from-bottom
- Deep-clone only for REMOVE inverse payload (unavoidable)
- Invariant validation O(n) acceptable to 10k if once per command

---

# AUDIT AREA 9 — PHASE 04.5.1 IMPLEMENTATION ORDER

Execute **strictly in this order**. Do not reorder. Do not start Canvas in parallel.

### STEP 1 — Seal document mutability

**Files:**  
`kernel/builderKernel.ts`, `document/documentFactory.ts` (clone helpers), `commands/impl/addNode.command.ts`, new `document/readonly.ts` (optional), tests  
**Purpose:** Readonly/export API; deep-clone on ADD; command-only mutation  
**Tests:** External mutate does not affect kernel; ADD payload aliasing test

### STEP 2 — Graph invariant validator

**Files:**  
`document/documentInvariants.ts`, `document/documentValidator.ts`, `kernel/builderKernel.ts` (`loadDocument` + post-dispatch)  
**Purpose:** `validateDocument` with error codes listed above  
**Tests:** Fixtures for each error code; valid default doc passes

### STEP 3 — Fix ADD_NODE undo / subtree policy

**Files:**  
`commands/impl/addNode.command.ts`, `commandEngine.test.ts`  
**Purpose:** No orphans on undo (refuse or recursive remove — pick refuse-if-children for simplicity + clarity)  
**Tests:** Add parent+child → undo parent fails OR removes both; document validates after

### STEP 4 — Serializable inverses

**Files:**  
`commands/command.interface.ts`, each `impl/*.ts`, `history/historyManager.ts`  
**Purpose:** Embed `inverse` (or before-state) in `SerializedCommand`; `fromSerialized` restores undoability  
**Tests:** serialize → JSON.parse/stringify → registry.create → undo/redo parity

### STEP 5 — Command payload Zod + registry hardening

**Files:**  
`commands/schemas.ts` (new), `commands/commandManager.ts`  
**Purpose:** Validate before factory; remove unsafe casts  
**Tests:** Reject malformed payloads; accept golden fixtures

### STEP 6 — Transaction API + BATCH registry

**Files:**  
`kernel/builderKernel.ts`, `commands/impl/batch.command.ts`, `commands/commandManager.ts`  
**Purpose:** `kernel.transaction`; register `BATCH`; nested deserialize; forbid nesting  
**Tests:** Mid-batch failure rolls back; one history entry; JSON round-trip BATCH

### STEP 7 — Plugin permission skeleton

**Files:**  
`plugins/plugin.types.ts`, `plugins/pluginRegistry.ts`, `registry/nodeRegistry.ts`  
**Purpose:** Manifest permissions; deny native overwrite by default  
**Tests:** Unauthorized overwrite throws; authorized register succeeds

### STEP 8 — History bounds + actor metadata stubs

**Files:**  
`history/historyManager.ts`, `kernel/builderKernel.ts`  
**Purpose:** `maxHistoryEntries`; optional `source` on entries  
**Tests:** Overflow drops oldest; exportSerialized length capped

### STEP 9 — Hardening regression suite + sign-off

**Files:**  
`src/lib/builder/*hardening*.test.ts`, update `.nexify-forge/prompts/04.5-builder-kernel.md` or add `04.5.1-hardening.md`  
**Purpose:** Prove C1–C4 / H1–H3 closed  
**Tests:** Full matrix green; `bun run typecheck` + `bun run test:unit`

**STOP.** Architecture Sign-off. Only then Phase 05 Canvas.

---

## Recommended implementation sequence (one line)

Seal mutation → invariants → ADD undo → serializable inverses → command Zod → transaction/BATCH → plugin permissions → history caps → regression sign-off → **Canvas**.

---

## Final decision

### CANVAS: **NO**

**Reason:** Critical mutability and replay/graph gaps remain open. Building Canvas on an unsealed kernel would freeze technical debt into every drag, drop, and undo interaction.

### After 04.5.1 sign-off gate

Canvas may start **only if** all blocker acceptance criteria above are evidenced by tests in-repo.

Then:

```text
04.5.1 Hardening
        ↓
Architecture Sign-off
        ↓
Phase 05 Canvas Engine
        ↓
Vision Import Runtime
        ↓
Plugin Marketplace
```

---

## Baseline tag (process note)

Pre-hardening scientific baseline for comparison:

```text
v0.4.5-kernel-foundation-audited
```

Must point at the commit containing Phase 04.5 kernel + forensic/gate reports, **before** 04.5.1 code lands.

---

**END OF GATE REPORT — DIAGNOSTIC ONLY; NO IMPLEMENTATION PERFORMED.**
