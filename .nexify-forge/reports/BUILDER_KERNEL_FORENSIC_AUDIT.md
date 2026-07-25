# BUILDER_KERNEL_FORENSIC_AUDIT.md

**Subject:** NEXIFY Forge Builder Kernel (`src/lib/builder`)  
**Claimed status:** Phase 04.5 implemented  
**Audit mode:** Read-only forensics (source code only)  
**Auditor role:** Principal Software Architect / Systems Auditor / Security Reviewer  
**Date:** 2026-07-25  
**Commit inspected:** `349aec1` (`feat(nexify-forge): phase 04.5 builder kernel`) on branch tracking `nexify-gooo/main`

---

# Executive Verdict

The Builder Kernel is a **real, non-trivial headless foundation** — not a fake stub. Document model, command objects, history entries, event bus, registry, plugin facade, and IR→command compiler exist in source and have passing unit tests for a **narrow happy path**.

It is **not** production-ready as a design engine, and it is **not** Canvas-ready.

The largest architectural truths:

1. **External mutation is trivial** — `getDocument()` returns a live mutable object.
2. **Undo is session-local and incomplete** — snapshots / previous values are not serialized; `ADD_NODE.undo` can orphan children.
3. **`BATCH` cannot be reconstructed from JSON** — not registered in `CommandRegistry`.
4. **Graph integrity is mostly unenforced** on load and after mutations.
5. **Plugin API is fully privileged** — overwrite nodes, inject commands, no permissions.
6. **IR pipeline is a compiler stub**, not a secured import pipeline (no adapters, weak IR validation, confidence unused).

**CAN START PHASE 05 CANVAS: NO**

Required hardening first (Phase 04.5.1), then Canvas.

---

# Architecture Score

| Dimension | Score (0–100) | Evidence summary |
|---|---:|---|
| Isolation / headless purity | **78** | No React/DOM imports in kernel modules; only external runtime dep used is `zod` in validator. |
| Module boundary clarity | **72** | Clear folders; but `BuilderUiState` co-located in `builderKernel.ts`; HTML `generateCode` lives in core registry. |
| Command engine completeness | **55** | Commands exist; replay/serialize gaps; no `kernel.transaction()`. |
| Graph integrity | **35** | Move has cycle check; load/validators skip parent↔children consistency; undo can orphan. |
| Security posture | **28** | Open plugins; live document mutation; `customScript` / `customCss` / unsanitized IR props. |
| Persistence / migration | **25** | Schema version gate only; no migrator; no persistence adapter. |
| Multiplayer / AI readiness | **30** | Serializable shapes exist; no OT/CRDT; undo state not in JSON; BATCH factory missing. |
| Test evidence strength | **48** | 13 tests, happy-path only; no Batch/Move/replay/invariant/red-team tests. |
| **OVERALL ARCHITECTURE** | **52 / 100** | Solid skeleton; unsafe as a closed kernel. |

---

# Verified Components

Evidence-backed confirmations (present in source, not inferred from reports):

| Component | Path | Verified behavior |
|---|---|---|
| Document types | `document/document.types.ts` | Decoupled `layout` / `style` / `interactions` / `assets` / `props` |
| Zod schemas | `document/documentValidator.ts` | Structural parse + exact `schemaVersion` check + root exists |
| Factory | `document/documentFactory.ts` | Creates root `Container` document |
| Node graph helpers | `nodes/nodeGraph.ts` | `getNode`, `collectDescendantIds`, `walkNodeIds` |
| Commands | `commands/impl/*` | `ADD_NODE`, `REMOVE_NODE`, `MOVE_NODE`, `UPDATE_PROPERTY`, `BATCH` classes exist |
| Command registry | `commands/commandManager.ts` | Factories for 4 types (not BATCH) |
| History | `history/historyManager.ts` | `HistoryEntry` + undo/redo stacks + `exportSerialized()` |
| Kernel | `kernel/builderKernel.ts` | `dispatch` / `undo` / `redo` / `loadDocument` |
| UI selection | `BuilderUiState` in same file | Selection outside history (correct intent) |
| Event bus | `kernel/eventBus.ts` | Sync subscribe/emit/unsubscribe/clear |
| Node registry | `registry/*` | String renderer IDs; native defs |
| Plugins | `plugins/*` | Register lifecycle; emits `PLUGIN_REGISTERED` |
| IR types + compiler | `imports/ir/*` | Version assert + tree → `AddNodeCommand[]` |
| Canvas RPC types | `renderer/canvas/canvasRpc.types.ts` | Types + `CANVAS_SANDBOX_ATTR` constant only |
| Tests | `*.test.ts` (5 files) | 13 tests; typecheck/unit suite green at audit time |

**External consumers:** none outside `src/lib/builder` (grep of `@/lib/builder` finds tests only). Kernel is unused by product UI yet.

**React coupling:** no `import … from "react"` in kernel production files. Capability flag `react: boolean` is metadata only.

---

# False Claims / Missing Pieces

Claims that overstate reality relative to code:

| Claim | Reality |
|---|---|
| “Complete command serialization / replay” | `serialize()` exists, but **undo private state is not in JSON**. `RemoveNode`/`MoveNode`/`UpdateProperty` need prior `execute` to hold snapshots. |
| “BATCH atomic transactions via kernel API” | `BatchCommand` exists; **`kernel.transaction()` does not**. BATCH **not** in `CommandRegistry`. |
| “Universal import pipeline” | Only `IRToCommandCompiler`. **No** Vision/Figma/HTML adapters, **no** IR Zod schema, **no** confidence gating. |
| “Canvas RPC / sandbox security” | **Types/comments only** — no host, no iframe, no PostMessage runtime, no origin checks. |
| “Plugin system” | Registration helper only — **no permissions, no sandbox, overwrite allowed**. |
| “Graph integrity” | Partial (move cycle check, root delete blocked). **No** post-mutation invariant validator; load accepts inconsistent graphs. |
| “Immutable document model” | **False.** Commands mutate in place; `getDocument()` exposes live object. |
| “Event bus as kernel communication layer” | Thin sync pub/sub. Declared events `NODE_CREATED` / `NODE_UPDATED` / `NODE_DELETED` / `DOCUMENT_SAVED` are **never emitted**. |
| “Isolated package / engine repo” | Code lives under app tree `src/lib/builder` inside product checkout. Headless *in imports*, not *as a package boundary*. |

---

# Critical Risks

## CRITICAL

### C1 — Live document escape hatch
**Evidence:** `BuilderKernel.getDocument()` returns `this.document` by reference.  
**Attack:** `kernel.getDocument().tree.nodes[id].props.title = "hacked"`.  
**Impact:** Bypasses commands, history, events, validation. Corrupts project silently.  
**Status:** Confirmed possible.

### C2 — `ADD_NODE.undo` orphans children
**Evidence:** `AddNodeCommand.undo` deletes only `payload.node.id`, does not recurse descendants.  
**Scenario:** Add parent → add child under parent → undo ADD_PARENT → child remains in `nodes{}` with dangling `parentId`.  
**Impact:** Graph corruption; Canvas/export undefined behavior.

### C3 — Serialized undo is a lie for snapshot commands
**Evidence:**
- `RemoveNodeCommand.snapshot` is instance-private, omitted from `serialize()`.
- `MoveNodeCommand.snapshot` same.
- `UpdatePropertyCommand.previousValue` same.
- `fromSerialized()` reconstructs command **without** undo memory.  
**Impact:** History replay / multiplayer / crash recovery cannot undo from JSON alone.

### C4 — Load accepts structurally invalid graphs
**Evidence:** `parseBuilderDocument` checks schema + root key existence only. Does **not** verify:
- every `children[]` id exists
- every `parentId` matches inverse children
- no cycles
- no orphan nodes
- `root.parentId === null`  
**Impact:** Malicious/corrupt documents load as “valid”.

## HIGH

### H1 — No `kernel.transaction()`; BATCH not registry-replayable
**Evidence:** No `transaction` symbol in kernel. `createDefaultCommandRegistry()` omits `"BATCH"`.  
**Impact:** Vision import cannot safely commit multi-node trees as one durable replayable unit.

### H2 — Plugin privilege with overwrite
**Evidence:** `NodeRegistry.register` overwrites with `console.warn` only. Facade exposes `registerCommand`, full `eventBus`, registries. `unregister` does not unregister nodes/commands.  
**Impact:** Marketplace-grade plugins can hijack native types and command factories.

### H3 — `UpdatePropertyCommand` is an unconstrained write primitive
**Evidence:** Forbids only root keys `id|parentId|children|type`. Allows `metadata`, `locked`, `hidden`, `style.customCss`, `interactions`, arbitrary `props.*` with `unknown` values.  
**Impact:** AI/plugin can disable locks, inject scripts payloads, rewrite metadata.

### H4 — Interaction model includes `customScript`
**Evidence:** `InteractionSystem` action enum includes `customScript`; payload `Record<string, unknown>`.  
**Impact:** Future renderer that honors this becomes XSS/RCE-adjacent depending on host.

### H5 — Shared object references on ADD_NODE
**Evidence:** `AddNodeCommand` shallow-copies node; `props`/`style`/`layout` objects are reused from payload.  
**Impact:** Caller mutates payload after dispatch → mutates live document without history.

## MEDIUM

### M1 — Event bus error isolation absent
**Evidence:** `emit` calls listeners in a bare `for` loop; listener throw aborts remaining listeners.  
**Impact:** One bad plugin/UI subscriber breaks telemetry/history side-effects for that event.

### M2 — Global singletons
**Evidence:** `globalEventBus`, `globalCommandRegistry`, `globalNodeRegistry`.  
**Impact:** Cross-test / multi-kernel contamination; Worker multi-instance coupling risk if imported carelessly.

### M3 — UI concerns in core registry
**Evidence:** `propertyControls` widgets (`color-picker`, etc.), HTML `generateCode` in `native.ts`, `BuilderUiState` in kernel file.  
**Impact:** Soft boundary erosion; harder to extract pure package later.

### M4 — Dead event types
**Evidence:** Types declared; kernel only emits `COMMAND_*`, `DOCUMENT_LOADED`, plugins emit `PLUGIN_REGISTERED`, UI emits `SELECTION_CHANGED`.  
**Impact:** False API surface; consumers may subscribe to events that never fire.

### M5 — Unbounded history memory
**Evidence:** Undo stack grows forever; `RemoveNode` stores `structuredClone` of entire subtree per entry.  
**Impact:** Long sessions / large deletes → memory pressure before Canvas even exists.

### M6 — IR confidence ignored
**Evidence:** `metadata.confidence` accepted; compiler never thresholds.  
**Impact:** Low-confidence Vision regions become first-class nodes.

## LOW

### L1 — `Date.now()` / `crypto.randomUUID()` in command paths
Non-determinism of ids/timestamps unless caller supplies them. Replay of *payloads* can still be deterministic if ids are fixed.

### L2 — Section native definition lacks `generateCode`
Incomplete native surface vs Text/Button/Image/Container.

### L3 — Package not physically isolated
Still under product `src/lib`; extraction to `@nexify/builder-kernel` not done.

---

# Security Findings

## Attack surface map

| Surface | Risk | Impact | Mitigation (required, not implemented) |
|---|---|---|---|
| `getDocument()` live ref | **Critical** | Silent corruption / authz bypass of command gate | Return deep-frozen/readonly snapshot or proxy; mutate only via `dispatch` |
| `loadDocument(unknown)` | **High** | Corrupt/malicious graph accepted if Zod-shaped | Graph invariant validator post-parse |
| `UPDATE_PROPERTY` + AI | **High** | Arbitrary field writes | Allowlist paths per node type; schema-validate values |
| Plugin register | **High** | Type/command hijack | Permission manifest; deny overwrite of native types |
| IR → props → future HTML | **High** | Stored XSS when rendered | Sanitize at IR compile + renderer; ban raw HTML props |
| `style.customCss` | **High** | CSS injection / UI redress | Disallow or CSP + sanitizer |
| `interactions.customScript` | **Critical** if honored | Script execution | Remove or sandbox; never `eval` |
| `generateCode` HTML | **Medium** | Partial escaping exists for text/label/attr; Container concatenates child HTML | Central AST renderer; never string-concat untrusted |
| Command replay JSON | **High** | Incomplete undo; type assertion casts (`as SerializedCommand<…>`) skip payload validation | Zod per command type; include inverse payloads |
| Canvas RPC (future) | **Medium** (types only now) | Origin confusion if mis-implemented | Enforce `allow-scripts` only + strict `event.origin` |

## Red-team scenarios (theoretical, code-backed)

1. **Imported “HTML” via IR props:** put `<img src=x onerror=…>` in `properties.text` → stored in `props` → if a non-escaping renderer is added later, XSS. Native `escapeHtml` helps only if that generator is used.
2. **Plugin overwrite:** register `type: "Button"` with malicious `generateCode` / defaults — `NodeRegistry` allows overwrite.
3. **Serialized document:** craft nodes with cycles / orphans that pass Zod → `loadDocument` succeeds.
4. **Command replay:** serialize `REMOVE_NODE`, reload app, `fromSerialized` + `undo` → fails (`No remove snapshot`).
5. **State mutation:** mutate via `getDocument()` then `undo` last real command → history and graph diverge.

---

# Performance Findings

Complexity from code structure (not benchmarked runtime):

| Operation | Complexity | Notes |
|---|---|---|
| Node lookup | **O(1)** | `Record<NodeId, BuilderNode>` |
| Add / update property | **O(1)** avg | Path walk O(path length) |
| Move cycle check | **O(depth)** | Walk `parentId` chain |
| Remove + snapshot | **O(subtree)** | `collectDescendantIds` + `structuredClone` each node |
| Walk tree | **O(n)** | DFS |
| History retention | **O(edits)** unbounded | Full command objects + optional subtree clones |

### Scale estimates (engineering judgment)

| Nodes | Expected | Bottleneck before Canvas |
|---:|---|---|
| 100 | Fine | None |
| 500 | Fine | History after many deletes |
| 1 000 | Acceptable | Serialize whole document cost; undo stack |
| 10 000 | Risky without caps | Unbounded history; deep `structuredClone` on large removes; full-document JSON parse on load |

No structural sharing, no command coalescing, no snapshot compaction — acceptable for foundation, **not** for large projects without 04.5.1 limits.

---

# Required Fix Order

Do **not** start Canvas until these land:

1. **Seal mutation API** — stop returning writable live document (readonly view / clone / proxy).  
2. **Graph invariant validator** — run after `loadDocument` and successful `dispatch`/`undo`/`redo`.  
3. **Fix `ADD_NODE.undo`** — refuse undo if node has children, or recursively remove (define semantics).  
4. **`kernel.transaction(commands)`** — wrap `BatchCommand`; single history entry; registry support for `"BATCH"` with nested deserialize.  
5. **Serialize undo material** — include inverse/snapshot data in `SerializedCommand` (or event-sourcing model).  
6. **Per-command payload Zod** — validate before `CommandRegistry.create` / AI ingest.  
7. **Plugin permission skeleton** — `permissions[]`, deny native overwrite by default.  
8. **IR Zod + confidence policy** — reject/quarantine low confidence; sanitize string props.  
9. **History bounds** — max depth / compact snapshots.  
10. **Event bus hardening** — try/catch per listener; emit real node lifecycle events or delete dead types.  
11. **Extract package boundary** — physical `@nexify/builder-kernel` (repo strategy already decided).

---

# Phase 05 Readiness

## CAN START PHASE 05 CANVAS: **NO**

### Because

- Writable document escape hatch makes Canvas selection/drag state and document state impossible to reason about safely.
- Undo/graph bugs will surface as “Canvas randomly loses nodes.”
- No atomic multi-node transaction API for drop/paste/import.
- Plugin/IR security is open; Canvas would amplify exploit surface via renderers.
- Canvas RPC is types-only; implementing UI on top of an unsealed kernel cements technical debt.

### Required fixes before Canvas (minimum gate)

1. Seal `getDocument()` + enforce command-only mutation.  
2. Graph invariants + `ADD_NODE.undo` correctness.  
3. `kernel.transaction()` + BATCH registry replay.  
4. Command payload validation + serialized undo/inverse.  
5. Plugin permission skeleton (even if first-party only).

After that gate: Canvas may begin as a **consumer** of kernel commands (not a second state owner).

---

# Phase-by-phase forensic answers (concise)

### Phase 1 — Repository forensics
1. **Isolated kernel?** Logically yes (no outbound app imports); physically no (embedded in product tree; UI state co-located).  
2. **Without React?** **Yes** (no React imports).  
3. **Web Worker?** **Likely yes** (`crypto`, `structuredClone`, no DOM); globals need care.  
4. **Server-side?** **Yes** (Node 19+ `crypto.randomUUID`).  
5. **UI leak?** **Partial** — `BuilderUiState`, property widgets, HTML generators.

### Phase 2 — Document model
External `document.tree.nodes[id].props.title="hacked"` → **YES, possible** via `getDocument()`.  
Immutable guarantees → **NONE**. Migration → **version equality only**.

### Phase 3 — Command engine
Deterministic execution given fixed payloads → **mostly yes**.  
Perfect undo → **NO**.  
Serializable → **partial**.  
Replay from JSON → **GAP** (undo state + BATCH).  
AI-safe → **NO** (no allowlists).  
Multiplayer sync → **NO**.

Architecture `SerializedCommand → Factory → ICommand → Execution`: **exists for 4 commands; BATCH GAP; undo state GAP**.

### Phase 4 — Transactions
`kernel.transaction([...])` → **DOES NOT EXIST**.  
`BatchCommand` rollback-on-failure → **EXISTS** (nested undo).  
Nested transactions → **undefined**.

### Phase 5 — Graph integrity
Orphans / cycles / duplicate ids / missing parents → **possible via load or undo bugs**. Move blocks some cycles. Root delete blocked.

### Phase 6 — Event bus
**Simple sync pub/sub**, not a durable kernel bus. No async, no isolation, cleanup via unsubscribe exists, no event versioning, telemetry-ready only as a hook point.

### Phase 7 — Plugins
Can overwrite nodes → **YES**. Inject commands → **YES**. Access internal registries/bus → **YES**. Bypass validation → **YES** (there is little validation).  
Future model needed: `plugin.manifest.permissions[]` / `capabilities[]`.

### Phase 8 — IR pipeline
Flow implemented only as **IR → commands**. Missing adapters, IR schema validation, confidence handling, HTML sanitization at boundary.

### Phase 9 — Performance
Lookups fine to ~1k–10k; history/clone/unbounded stacks are the pre-Canvas bottlenecks.

### Phase 10 — Security
See Security Findings. Highest immediate risks: live mutation, plugin overwrite, unconstrained property writes, future script/CSS surfaces.

### Phase 11 — Canvas decision
**NO** — see Phase 05 Readiness.

---

# Appendix A — Test coverage truth

Present tests cover:
- default document Zod accept / reject missing fields / schemaVersion
- add / update / remove (subtree) / undo-redo add
- event bus `COMMAND_EXECUTED` + selection outside history
- plugin register + renderer id strings
- IR 3-level compile + version reject

**Absent tests (material gaps):**
- `BatchCommand` atomic rollback
- `MoveNodeCommand` + cycle rejection
- serialize → `CommandRegistry.create` → re-execute/undo round-trip
- external mutation / freeze
- orphan/cycle load rejection
- plugin overwrite / unregister residue
- IR malformed payloads
- `ADD_NODE.undo` with children

Passing tests prove a **demo kernel**, not a **sealed engine**.

---

# Appendix B — Score rationale one-liner

**52/100:** Correct headless direction and real command/IR bones; unsealed mutation, incomplete undo/replay, weak graph/plugin/IR security, and missing transaction API block Canvas and any production trust.

---

**END OF AUDIT — NO CODE WAS MODIFIED.**
