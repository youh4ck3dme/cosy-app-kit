# REALITY CHECK AUDIT — Builder Kernel v0.4.5

**Type:** Empirical proof run (not documentation opinion)  
**Branch:** `phase-04.5.1-hardening`  
**Foundation tag:** `v0.4.5-kernel-foundation` → `349aec1`  
**Audited tag:** `v0.4.5-kernel-foundation-audited` → `904f4c1`  
**Executed:** 2026-07-25T21:36:18Z via Bun runtime probes against live `src/lib/builder`  
**Code modified:** none (probes only)

---

## Executive verdict

Architectural docs claimed risks. **Runtime proved them.**

| Metric | Value |
|---|---:|
| Probes | 11 |
| PASS | 1 |
| FAIL | 10 |
| Canvas readiness | **NO** |
| Proceed to 04.5.1 implementation | **YES — after this freeze** |

This is the missing “Reality Check”: not another essay — executable evidence.

---

## Process freeze (was missing — now done)

| Item | Status |
|---|---|
| `git tag v0.4.5-kernel-foundation` | ✅ on `349aec1`, pushed to `nexify-gooo` |
| `git tag v0.4.5-kernel-foundation-audited` | ✅ on `904f4c1` (docs) |
| `git branch phase-04.5.1-hardening` | ✅ tracking `nexify-gooo/phase-04.5.1-hardening` |
| Kernel chaotic edits on `main` | ❌ stopped — work only on hardening branch |

---

## Probe results (source of truth)

| ID | Claim under test | Verdict | Evidence |
|---|---|---|---|
| C1 | `getDocument()` sealed | **FAIL** | External write set `title=HACKED_EXTERNALLY` and `children=["ghost"]` on live kernel state |
| C2 | `ADD_NODE.undo` safe for subtrees | **FAIL** | After undoing ADD of `sec2` while `btn2` existed, `btn2` remained (orphan) |
| GRAPH_SESSION | delete container → undo/redo/undo identical | **FAIL** | Session graph JSON diverged (likely metadata timestamps / versions — still a determinism smell) |
| C3_REMOVE | REMOVE JSON → deserialize → undo | **FAIL** | `undoSuccess=false` — `No remove snapshot available to undo.`; container/button absent |
| C3_UPDATE | UPDATE JSON → deserialize → undo | **PASS*** | Restored `text=A` only after **re-execute** on reconstructed command (captures `previousValue` again). JSON alone does **not** carry inverse. Treat as **conditional PASS / architectural FAIL for cold undo**. |
| C4 | `loadDocument` rejects bad graphs | **FAIL** | Document with orphan + dangling child id **accepted** |
| H1 | `kernel.transaction` exists | **FAIL** | `typeof transaction=undefined` |
| H2 | `BATCH` in registry | **FAIL** | `has(BATCH)=false` |
| H3 | Plugin cannot overwrite native nodes | **FAIL** | Logged `Overwriting node definition for type: Container`; displayName became `Hijacked` |
| IR_DET | same IR → same tree | **FAIL** | Two compiles diverged (non-deterministic metadata/`Date.now()` noise at minimum) |
| ALIAS | ADD deep-clones props | **FAIL** | Mutating caller `node.props.text` after dispatch changed kernel node to `2` |

\*See nuance above — do not celebrate C3_UPDATE.

---

## What this proves about “tests passed”

Unit tests passed a **happy path**. Reality check proves:

1. History can lie across process boundaries (REMOVE undo).  
2. Document is not a sealed aggregate.  
3. Plugins can hijack the core registry today.  
4. IR “determinism” is not guaranteed byte-identical.  
5. Transaction API is documentation wish, not code.

**Passing Vitest ≠ sealed engine.**

---

## Mapping to 04.5.1 (still do not skip order)

Implement only on `phase-04.5.1-hardening`, against freeze tags:

1. Seal mutability (C1 + ALIAS)  
2. Graph invariants (C4)  
3. ADD undo policy (C2)  
4. Serializable inverses (C3_REMOVE + real cold UPDATE undo)  
5. Command Zod  
6. `transaction` + BATCH registry (H1 + H2)  
7. Plugin permissions (H3)  
8. History caps + IR timestamp stability for determinism (IR_DET / GRAPH_SESSION)  
9. Regression suite must **re-run this reality matrix** until 11/11 PASS  

---

## Final decisions

| Question | Answer |
|---|---|
| Start Canvas now? | **NO** |
| Start coding 04.5.1 immediately without this freeze? | **NO** (freeze now complete) |
| Start 04.5.1 hardening next? | **YES** — when explicitly ordered |
| Are prior forensic docs still valid? | **YES** — empirically confirmed |

---

## Tag map

```text
v0.4.5-kernel-foundation          → 349aec1  (kernel code freeze)
v0.4.5-kernel-foundation-audited  → 904f4c1  (kernel + forensic/gate docs)

phase-04.5.1-hardening            → work branch for seals/fixes only
```

Compare after hardening:

```bash
git diff v0.4.5-kernel-foundation..phase-04.5.1-hardening -- src/lib/builder
```

---

**END — REALITY CHECK. NO HARDENING CODE LANDED.**
