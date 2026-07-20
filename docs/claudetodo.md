# Claude port board — cherry-pick only → `developeredit`

> **NEVER full-merge Claude work.**  
> **Source of truth:** `developeredit` only.  
> **Claude source:** `origin/claude/app-quality-overhaul-y6cv3u` (+ main history after PR #3).  
> **Inventory:** [`claude-pr3-port.md`](./claude-pr3-port.md) · **Sim:** [`merge-sim-report.md`](./merge-sim-report.md)  
> **Last sync:** 2026-07-20 — **S1–S7 ✅ · viewport-lock ✅ · S8 human residual**

---

## Rules

1. Work **only** on `developeredit`.  
2. Prefer `git show origin/claude/...:path` + hand-wire — never `git merge` Claude/`main`.  
3. On conflict: **OmniOps agent + Cursor C★ + MR-40**, then re-apply Claude UX.  
4. **Skip** Claude CommandPalette, templates.ts, versions SQL `…090000…`, mass prettier.  
5. Keep Grok migration `20260720120000_artifact_versions.sql`.  
6. After each slice: `bun test` + `bunx tsc --noEmit`.

---

## Slice tracker

| ID | Slice | Status | Owner |
|----|-------|--------|-------|
| **S1** | PWA | ✅ | Grok |
| **S2** | Haptics + motion | ✅ | Grok |
| **S3** | Optimistic threads | ✅ | Grok |
| **S4** | Stick-to-bottom / Latest | ✅ | Cursor |
| **S5** | Canvas postMessage token | ✅ | Grok |
| **S6** | Shortcut gaps (Esc) | ✅ | Cursor |
| **S7** | smoke + pwa/haptics vitest | ✅ | Grok |
| **S8** | Push + SQL + manual smoke | 🟡 push ✅ · SQL/smoke **TY** | Human |
| **S9** | iOS viewport lock shell | ✅ | finalize session |
| **S10** | Light mode (`theme.ts`) | ✅ | Claude `1707f67` hand-port |

---

## Definition of done (port program)

- [x] PWA / haptics / optimistic threads  
- [x] S4–S7  
- [x] Viewport lock for mobile rubber-band  
- [x] No full Claude branch merge  
- [ ] Human: SQL versions + smoke checklist  
- [ ] Optional: light mode port (S10)

---

## Do not re-open

- Mega Claude merge  
- Cursor mega A→Z (C★ already closed)  
- Parallel agents fighting on Canvas/chat
