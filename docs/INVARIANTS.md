# Invariants

Source: `src/lib/builder/document/documentInvariants.ts`

## Role

Structural integrity checks beyond Zod shape validation. Invoked by the kernel after successful command execute (and available as a standalone API).

## API

```ts
validateDocument(document): DocumentValidationResult
assertValidDocument(document): void  // throws when invalid
```

`DocumentValidationResult`: `{ ok: boolean; issues: DocumentInvariantIssue[] }`.

## Issue codes

| Code                       | Meaning                                   |
| -------------------------- | ----------------------------------------- |
| `ROOT_MISSING`             | `rootId` absent from nodes map            |
| `ROOT_HAS_PARENT`          | Root must have `parentId: null`           |
| `ORPHAN_NODE`              | Node unreachable / inconsistent ownership |
| `DANGLING_CHILD_ID`        | Child id listed but missing               |
| `INVALID_PARENT_REFERENCE` | Parent pointer invalid                    |
| `PARENT_CHILD_ASYMMETRY`   | Parent/child relation mismatch            |
| `CYCLE_FOUND`              | Cycle in parent pointers                  |
| `DUPLICATE_CHILD_ENTRY`    | Duplicate child id in children list       |

Cycle detection uses a single-pass parent-pointer walk (documented in source comments).

## Example

See [`examples/document-validation/`](../examples/document-validation/).

## Relation to diagnostics

Structured invariant _reporting_ for observability is a **Future milestone** (v0.4.6). Runtime enforcement remains in `validateDocument` regardless.
