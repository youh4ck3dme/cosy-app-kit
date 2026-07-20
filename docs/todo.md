# Builder roadmap hub (OmniOps · Mistral)

> **Status 2026-07-20 post-C★:**  
> **Grok G0–G2** + **Cursor A→Z (C★)** are in code on **`developeredit`**.  
> CI was green before H–L land; re-run after commit. **`main` untouched.**  
> Boards: [`groktodo.md`](./groktodo.md) · [`cursortodo.md`](./cursortodo.md) · mega-prompt: [`CURSOR_MEGA_PROMPT.md`](./CURSOR_MEGA_PROMPT.md)

---

## Parallel worlds

| World | File | Owner | Status |
|-------|------|-------|--------|
| **A** | [`groktodo.md`](./groktodo.md) | **Grok** | G0–G2 ✅ · G3 BPI ⏳ human live samples |
| **B** | [`cursortodo.md`](./cursortodo.md) | **Cursor** | **C★ ✅** (A–L done) |

**Scoreboard:** [`progress.md`](./progress.md) · **Architecture:** [`architecture.md`](./architecture.md)  
**Tools/versions:** [`agent-tools.md`](./agent-tools.md) · **SQL:** [`migrations.md`](./migrations.md)  
**Smoke:** [`smoke-checklist.md`](./smoke-checklist.md) · **Samples:** [`samples/2026-07/`](./samples/2026-07/)

---

## Rules of engagement

1. One world per agent session (unless human says otherwise).  
2. File boundaries in each board § Ownership.  
3. Shared files: Grok owns server contracts; Cursor consumes.  
4. Branch **`developeredit`** only · **`main` locked** (PR + human merge).  
5. Product AI: **Mistral only**.  
6. Never commit secrets.  
7. After prod: smoke `/api/ai-status` + `/chat`.

---

## Where we stand

### Shipped on `developeredit`

| Area | Detail |
|------|--------|
| Agent | Hybrid tools + fence, Codestral Build, truncate, stream data-parts |
| G2 | `artifact_versions` migration + list/restore fns (SQL **must apply** for restore) |
| Tests | Vitest **54** pass · suggestFollowups API |
| Canvas | Monaco code + Diff, VersionTimeline, Network/console polish |
| Chat UX | Palette, quote/chips/DnD, artifact focus |
| Growth | Templates routes + seed, Tour, landing “Made with Builder” |
| Share | Share panel + `/a/$id/embed` |
| E2E | Local Playwright specs only (not CI) |

### Human blockers (do these next)

| # | Action | Why |
|---|--------|-----|
| 1 | Apply `supabase/migrations/20260720120000_artifact_versions.sql` | Live version **restore** |
| 2 | Run [`smoke-checklist.md`](./smoke-checklist.md) | Edit/retry, Plan/Build, canvas |
| 3 | Optional BPI suite → `docs/samples/2026-07/` + real scores in `progress.md` | Grok G★ |
| 4 | Optional `bun add -d @playwright/test && bunx playwright install` | Local L e2e |
| 5 | PR `developeredit` → `main` when you want | Ship |

### Post-1.0 backlog (either world, human prioritizes)

Billing · collab · voice · public API · lint-as-CI · Playwright in CI · Monaco format-on-save · user templates

---

## Definition of “Builder 1.0-ready”

- [x] Cursor **C★** (`cursortodo.md` tracker)  
- [x] Grok hybrid tools + versions **code** (G0–G2)  
- [ ] SQL migration **applied** on project  
- [ ] Live smoke checklist green  
- [ ] BPI measured (not estimated) in `progress.md`  
- [ ] PR reviewed; human merges `main`  
- [ ] Prod `/api/ai-status` + `/chat` smoke  

---

## Quick links

| Who | Start | First task now |
|-----|--------|----------------|
| **Human** | [migrations.md](./migrations.md) + [smoke-checklist.md](./smoke-checklist.md) | SQL + smoke; **do not merge PR #3 raw** |
| **Grok** | [claude-pr3-port.md](./claude-pr3-port.md) | Port Claude slices (PWA done); BPI after smoke |
| **Cursor** | [cursortodo.md](./cursortodo.md) | **C★ done** — polish only if human asks |
