# Phase 04.5.1 Hardening — Architecture Sign-off

**Branch:** `phase-04.5.1-hardening`  
**Baseline:** `v0.4.5-kernel-foundation` / `v0.4.5-kernel-foundation-audited`  
**Scope:** `src/lib/builder/**` only

## Kernel Trust Score

| Metric                                   | Target | Result |
| ---------------------------------------- | -----: | ------ |
| Unauthorized mutation                    |      0 | 0      |
| Invalid graph acceptance                 |      0 | 0      |
| Command replay mismatch                  |      0 | 0      |
| Non-deterministic IR (comparable fields) |      0 | 0      |
| Plugin privilege escalation (default)    |      0 | 0      |
| Transaction rollback failure             |      0 | 0      |

**Reality check matrix:** `src/lib/builder/realityCheck.matrix.test.ts` — all PASS

## Delivered

1. Sealed `getDocument()` / `getReadonlyDocument()` (deep clone)
2. `validateDocument` invariants on load + post-command
3. `ADD_NODE` deep-clone + undo refuse-if-children
4. `kernel.transaction` → `BatchCommand` atomic history entry
5. `BATCH` in command registry + Zod payload schemas
6. Durable `inverse` on REMOVE / UPDATE / MOVE serialize
7. History `maxHistoryEntries=100` + `exportEventLog()`
8. Plugin permissions skeleton (deny native overwrite by default)
9. Stable IR compile timestamps

## Canvas

**NO** — still blocked until product decides Phase 05 consumer work. Kernel seal gate for Canvas readiness is met from Trust Score perspective; Canvas itself is out of scope for 04.5.1.

## Verification

- `bunx vitest run src/lib/builder` PASS
- `bun run typecheck` PASS
- eslint `src/lib/builder` PASS
