# Claude port board — cherry-pick only → `developeredit`

> **NEVER merge Claude work into other branches without this board.**  
> **Source of truth for product code:** `developeredit` only.  
> **Claude source:** `origin/claude/app-quality-overhaul-y6cv3u` (already on remote history — we **port slices**, we do not re-merge whole PR).  
> **Sister boards:** [`todo.md`](./todo.md) · [`groktodo.md`](./groktodo.md) · [`cursortodo.md`](./cursortodo.md)  
> **Inventory:** [`claude-pr3-port.md`](./claude-pr3-port.md) · **Merge sim:** [`merge-sim-report.md`](./merge-sim-report.md)  
> **Last sync:** 2026-07-20 — S1–S4 + S6 done; S5/S7 remain

---

## Rules

1. Work **only** on `developeredit`.  
2. Prefer `git checkout origin/claude/... -- path` then **hand-wire** — never full `git merge` Claude branch.  
3. On conflict: **prefer OmniOps agent + Cursor C★ UI**, then re-apply Claude UX.  
4. **Skip** Claude CommandPalette, templates.ts, versions SQL `…090000…`, mass prettier.  
5. Keep Grok migration `20260720120000_artifact_versions.sql` as the only versions schema.  
6. After each slice: `bun test` + `bunx tsc --noEmit`.

---

## Slice tracker

| ID | Slice | Status | Owner |
|----|-------|--------|-------|
| **S1** | PWA (manifest, sw, offline, icons, register-sw) | ✅ | Grok |
| **S2** | haptics + motion libs; haptic on send | ✅ | Grok |
| **S3** | optimistic thread create/delete + AlertDialog | ✅ / this session | Grok |
| **S4** | MessageList stick-to-bottom / Latest pill | ✅ | Cursor |
| **S5** | Canvas postMessage token (console bridge) | ☐ | Grok careful |
| **S6** | Shortcut **gaps only** (not full Claude palette) | ✅ | Cursor |
| **S7** | `scripts/smoke.ts` + selected `__tests__` | ☐ | Grok |
| **S8** | Close loop: push developeredit, freeze extra Claude PRs | ☐ | Human |

---

## Parallel prompts (copy-paste)

### Prompt A — Grok (backend-safe + shell wiring)

```
You are Grok / OmniOps on branch developeredit ONLY.
Never push or merge other long-lived product branches.

Read docs/claudetodo.md and docs/claude-pr3-port.md.
Continue Claude cherry-pick slices that do NOT rewrite Monaco or agent tools.

Allowed: ThreadList optimistic mutations, haptics call sites, Canvas postMessage token (S5),
scripts/smoke.ts, src/lib/__tests__ that don't fight src/lib/agent/*.test.ts.

Forbidden: merge claude/* branch, edit src/lib/agent/tools execute logic unless bugfix,
second CommandPalette, Claude templates.ts, Claude versions SQL 090000.

After work: bun test && bunx tsc --noEmit. Update docs/claudetodo.md tracker.
```

### Prompt B — Cursor (UI only)

```
You are Cursor on branch developeredit ONLY.

Read docs/claudetodo.md slices S4 and S6 only.
- S4: improve MessageList scroll (stick-to-bottom / Latest pill) WITHOUT removing tool cards,
  quote, chips, or edit/retry.
- S6: if any keyboard gaps vs docs/keyboard.md, add them via existing use-hotkeys / palette —
  do NOT import Claude CommandPalette or ShortcutsDialog wholesale.

Do NOT edit: src/lib/agent/**, src/routes/api/chat.ts, supabase/migrations/**.
Do NOT merge any Claude branch.
bunx tsc --noEmit when done. Update docs/claudetodo.md S4/S6 status.
```

### Prompt C — Human (ops) — **kedy a čo**

Full checklist: **[`docs/HUMAN_NOW.md`](./HUMAN_NOW.md)**

| # | Čo | Kedy |
|---|-----|------|
| 1 | `git push origin developeredit` | Hneď keď chceš CI / share / deploy z GH |
| 2 | SQL `20260720120000` | Pred testom **Versions restore** v Canvase |
| 3 | `smoke-checklist.md` | Pred demom / “je to OK” |
| 4 | No full Claude merge | Vždy |

---

## Definition of done (Claude port)

- [x] PWA on developeredit  
- [x] Haptics available + used on send  
- [x] Optimistic threads  
- [x] S4 stick-to-bottom / Latest pill  
- [x] S6 Esc closes shortcuts/palette (via use-hotkeys)  
- [ ] S5, S7 as needed  
- [ ] developeredit pushed + CI green  
- [ ] No full Claude branch merge  
