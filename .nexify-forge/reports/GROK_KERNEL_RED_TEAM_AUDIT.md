# Grok Kernel Red Team Audit — Phase 04.5.1

**Auditor:** External Principal Engineer (forensic destruction pass)  
**Date:** 2026-07-25  
**Scope:** `src/lib/builder/**` headless Builder Kernel  
**Method:** Code inspection + live adversarial probes (not prior reports, not green tests)  
**Truth rule:** The code is the only authority.

---

## Executive summary

Previous hardening closed several surface bugs (clone-on-read, post-success integrity, transaction API, IR payload time injection). **It did not produce a kernel that survives abuse.**

Live probes on the current tree produced **7 CRITICAL**, **2 HIGH**, and **1 MEDIUM** confirmed findings.

| Severity | Count | Themes                                                                                                  |
| -------- | ----: | ------------------------------------------------------------------------------------------------------- |
| CRITICAL |     7 | Snapshot restore gap, constructor alias, plugin escape hatches, prototype pollution, IR non-determinism |
| HIGH     |     2 | Constructor accepts corrupt docs, safeParse skips graph invariants                                      |
| MEDIUM   |     1 | Live HistoryManager mutators exposed                                                                    |

**Trust score before repair (this audit): 4 / 10**

Canvas readiness: **NO** — document integrity can be corrupted by a single hostile `ICommand` or marketplace plugin.

---

## 1. Mutation safety

### Expected

```ts
document.tree.nodes[id].props.value = "malicious";
// must not affect kernel internal state
```

### Observed

| Surface                                  | Result            | Evidence                                                                          |
| ---------------------------------------- | ----------------- | --------------------------------------------------------------------------------- |
| `getDocument()`                          | **PASS**          | Returns `structuredClone`; external title/props mutation does not re-enter kernel |
| `getReadonlyDocument()`                  | **WEAK**          | Alias of `getDocument()` — mutable clone, no freeze, no readonly type             |
| Constructor `new BuilderKernel(doc)`     | **CRITICAL FAIL** | Stores caller reference; mutating `doc` mutates kernel state                      |
| Command payload alias (`AddNodeCommand`) | **PASS**          | `cloneNode` on execute                                                            |

**Attack A1 (constructor alias) — CONFIRMED:**

```ts
const doc = createDefaultDocument({ title: "orig" });
const k = new BuilderKernel(doc);
doc.metadata.title = "MUTATED_VIA_ALIAS";
doc.tree.nodes[rootId].props = { hacked: true };
// k.getDocument() reflects MUTATED_VIA_ALIAS + hacked
```

**Root cause:** `builderKernel.ts` constructor:

```ts
this.document = document ?? createDefaultDocument(); // no clone, no validate
```

---

## 2. Command engine correctness

| Command         | execute      | undo                     | serialize           | deserialize | Notes                                                                                  |
| --------------- | ------------ | ------------------------ | ------------------- | ----------- | -------------------------------------------------------------------------------------- |
| ADD_NODE        | OK           | OK (refuses if children) | OK                  | OK          | Clones node; no inverse field needed                                                   |
| REMOVE_NODE     | OK           | OK                       | inverse OK          | OK          | Subtree snapshot in inverse                                                            |
| UPDATE_PROPERTY | **CRITICAL** | OK                       | inverse OK          | OK          | Prototype pollution via path                                                           |
| MOVE_NODE       | OK           | OK                       | inverse OK          | OK          | Cycle guard present                                                                    |
| BATCH           | **CRITICAL** | Partial                  | nested serialize OK | OK          | Nested undo failures ignored; relies on kernel snapshot (which is broken on fail path) |

### 2.1 Prototype pollution (CRITICAL)

```ts
dispatch(
  new UpdatePropertyCommand({
    nodeId: rootId,
    path: "__proto__.polluted",
    value: true,
  }),
);
// → success: true
// Object.prototype.polluted === true
// ({}).polluted === true
```

Also: `props.__proto__.y` pollutes object prototypes used for props.

`FORBIDDEN_ROOT_PATHS` only blocks `id|parentId|children|type` — not `__proto__` / `prototype` / `constructor`.

### 2.2 Lost information / non-determinism

- Command IDs default to `crypto.randomUUID()` — non-deterministic history IDs.
- Node `metadata.updatedAt` uses `Date.now()` on every mutation — structural replay differs in timestamps (acceptable if consumers compare structure only; must not claim full document byte equality).
- Kernel bumps `document.metadata.updatedAt = Date.now()` on success — same.

---

## 3. Transaction integrity

### Expected

Commands 1..N-1 success, command N failure → **complete rollback**, no partial document.

### Observed

| Path                                                              | Result                          |
| ----------------------------------------------------------------- | ------------------------------- |
| `transaction(cb)` queue + `BatchCommand` happy path               | Works when nested undos succeed |
| Hostile / buggy `ICommand` mutates then returns `success: false`  | **CRITICAL FAIL**               |
| Batch step succeeds, later step fails, earlier undo returns false | **CRITICAL FAIL**               |

**Attack A3 — CONFIRMED:**

```ts
// command.execute mutates title + injects ghost node, then returns success:false
kernel.dispatch(evil);
// document remains title=PARTIAL, nodes.ghost present
```

**Root cause:** `dispatch` takes a pre-execute snapshot but **only restores it on post-success integrity failure**, not on `!result.success`:

```ts
const snapshot = cloneDocument(this.document);
const result = command.execute(this.document);
if (!result.success) {
  return result; // snapshot discarded — partial mutations stick
}
```

**Attack A4 — CONFIRMED:** `BatchCommand` rollback calls nested `undo()` without checking success; broken undo leaves dirty state; kernel does not heal it.

`transaction()` itself is correctly designed as single-history Batch — **the failure is the kernel fail-path, not the API shape.**

---

## 4. Graph integrity

| Check                                   | Status                                                                                |
| --------------------------------------- | ------------------------------------------------------------------------------------- |
| Root existence                          | OK (`ROOT_MISSING`)                                                                   |
| Orphan detection                        | OK (`ORPHAN_NODE`)                                                                    |
| Parent consistency                      | OK (`PARENT_CHILD_ASYMMETRY`)                                                         |
| Cycle prevention (parent walk)          | OK (`CYCLE_FOUND`)                                                                    |
| Duplicate child entries                 | OK                                                                                    |
| Dangling child IDs                      | OK — rejected post-dispatch via integrity + snapshot restore **on success path only** |
| `loadDocument` / `parseBuilderDocument` | OK — runs `assertValidDocument`                                                       |
| `safeParseBuilderDocument`              | **HIGH FAIL** — Zod only, accepts orphans                                             |
| Constructor corrupt input               | **HIGH FAIL** — accepts orphan graph                                                  |

Malicious documents are rejected on the **load** path; not on **construct**.

---

## 5. Replay determinism

| Scenario                                                           | Result                                      |
| ------------------------------------------------------------------ | ------------------------------------------- |
| serialize → JSON → deserialize → undo (REMOVE/UPDATE with inverse) | PASS (existing tests)                       |
| Same structural commands, ignore timestamps/IDs                    | PASS                                        |
| Full document equality after two live replays                      | FAIL (Date.now on metadata)                 |
| IR compile ×2 with fixed `compileTime` — **payloads**              | PASS                                        |
| IR compile ×2 with fixed `compileTime` — **command IDs**           | **CRITICAL FAIL** (`randomUUID` still used) |

```ts
compiler.compile(ir, "root", 42)[0].id;
// differs every call — AddNodeCommand(id = undefined → randomUUID)
```

---

## 6. IR determinism

| Factor                                       | Status                                        |
| -------------------------------------------- | --------------------------------------------- |
| Node IDs from IR                             | Deterministic (IR ids)                        |
| Node metadata timestamps                     | Deterministic when `compileTime` set          |
| Fallback id `ir_${type}_${index}`            | Deterministic                                 |
| Command id / default timestamp               | **Non-deterministic** without explicit id arg |
| `Date.now()` / `randomUUID` in compiler body | Not present — bug is in command constructors  |

**Deterministic mode is incomplete.**

---

## 7. Plugin security

| Attack                                                                               | Result                                                     |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| Register custom node without overwrite                                               | PASS (default perms)                                       |
| Overwrite native Container without `nodes.overwrite` via `nodes: []`                 | PASS (throws)                                              |
| Overwrite via `kernel.nodeRegistry.register(..., { overwrite: true })`               | **CRITICAL FAIL**                                          |
| Overwrite `ADD_NODE` via `kernel.commandRegistry.register(..., { overwrite: true })` | **CRITICAL FAIL**                                          |
| `document.write` permission                                                          | Defined but unused (facade has no document write API — OK) |
| Core command types protected                                                         | **NO** — any plugin with raw registry can replace them     |

**Root cause:** `PluginRegistry.createFacade` hands out live `nodeRegistry` and `commandRegistry` references. Permission checks only wrap `registerNode` / `registerCommand`. Marketplace plugins can ignore them.

Permission model vs required minimum:

| Required                      | Present                     | Effective                                         |
| ----------------------------- | --------------------------- | ------------------------------------------------- |
| CORE_NODE_WRITE = false       | `nodes.overwrite` opt-in    | Broken by escape hatch                            |
| CUSTOM_NODE_REGISTER = true   | default `nodes.register`    | OK                                                |
| COMMAND_REGISTER = restricted | default `commands.register` | Broken by escape hatch; core types not denylisted |

---

## 8. Additional findings

### MEDIUM — History mutator surface

`getHistory()` returns the live `HistoryManager`. External `clear()` erases undo/redo without restoring document — history desync attack (not document corruption, but session integrity break).

### Design debt (not scored critical)

- No `deepFreeze` on readonly snapshots
- Batch nested rollback does not short-circuit or surface undo failures
- `UpdateProperty` `hadPrevious` always true even for missing paths (harmless)

---

## Attack matrix (executed)

| ID  | Attack                                 | Severity | Status               |
| --- | -------------------------------------- | -------- | -------------------- |
| A1  | Constructor document alias mutation    | CRITICAL | CONFIRMED            |
| A2  | getDocument external mutation          | —        | RESISTED             |
| A3  | Mutate-then-fail command               | CRITICAL | CONFIRMED            |
| A4  | Batch fail + broken nested undo        | CRITICAL | CONFIRMED            |
| A5  | Plugin nodeRegistry overwrite escape   | CRITICAL | CONFIRMED            |
| A6  | Plugin commandRegistry ADD_NODE hijack | CRITICAL | CONFIRMED            |
| A7  | safeParse orphan acceptance            | HIGH     | CONFIRMED            |
| A8  | IR command ID non-determinism          | CRITICAL | CONFIRMED            |
| A9  | `__proto__` UpdateProperty pollution   | CRITICAL | CONFIRMED            |
| A10 | History clear desync                   | MEDIUM   | CONFIRMED            |
| A11 | Dangling child via ADD_NODE            | —        | RESISTED (integrity) |
| A12 | Constructor corrupt document           | HIGH     | CONFIRMED            |

---

## Mandatory patches (mapped)

| #   | Requirement                          | Current                  | Action                                                   |
| --- | ------------------------------------ | ------------------------ | -------------------------------------------------------- |
| 1   | Immutable external document boundary | Partial                  | Clone+validate constructor; freeze `getReadonlyDocument` |
| 2   | Graph invariant enforcement          | Partial                  | safeParse + constructor validation                       |
| 3   | Complete command serialization       | Mostly OK                | Keep; no architecture change                             |
| 4   | Atomic transactions                  | API OK, fail-path broken | Snapshot restore on **any** failed execute               |
| 5   | Plugin permission model              | Broken                   | Sealed registry views; core command denylist             |
| 6   | IR deterministic compilation         | Incomplete               | Stable command IDs from IR + index                       |
| 7   | Adversarial tests                    | Incomplete               | Add probes for A1–A10                                    |

---

## What not to do

- Do **not** rewrite the kernel architecture
- Do **not** move folders or replace command engines
- Do **not** trust existing `realityCheck.matrix.test.ts` as proof of abuse resistance — it never ran A1/A3/A5/A9

---

## Next phase

**PHASE B — Surgical repair** only for confirmed findings above.  
Every patch must include: Problem / Risk / Solution / Tests.
