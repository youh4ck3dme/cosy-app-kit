# Builder roadmap hub (OmniOps · Mistral)

> **Status 2026-07-20:** Product line = **`developeredit` only.**  
> **Grok G0–G2** + **Cursor C★** + **Claude cherry-pick S1–S3** (in progress).  
> Boards: [`groktodo.md`](./groktodo.md) · [`cursortodo.md`](./cursortodo.md) · [`claudetodo.md`](./claudetodo.md)

---

## Three parallel tracks (same branch)

| Track | Board | Focus now |
|-------|-------|-----------|
| **Grok** | [`groktodo.md`](./groktodo.md) | Agent health, BPI after smoke, S5/S7 ports |
| **Cursor** | [`cursortodo.md`](./cursortodo.md) | **C★ done** — optional S4/S6 polish |
| **Claude port** | [`claudetodo.md`](./claudetodo.md) | Cherry-pick only — **S1–S3 ✅**; S4–S7 open |

**Do not** full-merge Claude remote branches into `developeredit`.  
**Inventory:** [`claude-pr3-port.md`](./claude-pr3-port.md) · **Sim:** [`merge-sim-report.md`](./merge-sim-report.md) (~30% full merge / ~85% cherry-pick)

---

## Rules

1. All work on **`developeredit`**.  
2. One track per agent session when possible.  
3. Grok owns `src/lib/agent/**`, `api/chat`, migrations (Grok schema only).  
4. Cursor owns canvas/shell polish; no agent execute rewrites.  
5. Claude track = **file checkout + hand-wire**, never branch merge.  
6. Mistral only for product AI.  
7. After deploy: smoke `/api/ai-status` + `/chat`.

---

## Shipped on developeredit (code)

| Area | Status |
|------|--------|
| Hybrid agent + fence + truncate + stream parts | ✅ |
| artifact_versions code + list/restore | ✅ (SQL apply human) |
| Cursor A–Z C★ (Monaco, templates, embed, e2e local) | ✅ |
| PWA + haptics (Claude S1–S2) | ✅ |
| Optimistic threads (Claude S3) | ✅ this session |
| Vitest | 54+ |

---

## Human next — **kedy** (detail: [`HUMAN_NOW.md`](./HUMAN_NOW.md))

| # | Akcia | Kedy |
|---|--------|------|
| 1 | `git push origin developeredit` | Hneď (agent push často 403) |
| 2 | SQL `20260720120000` | Pred restore versions |
| 3 | Smoke checklist | Pred demom |
| 4 | BPI samples | Keď chceš skóre v progress.md |

---

## Parallel prompts (short)

| Who | Full text |
|-----|-----------|
| Grok | See **Prompt A** in [`claudetodo.md`](./claudetodo.md) |
| Cursor | See **Prompt B** in [`claudetodo.md`](./claudetodo.md) |
| Human | See **Prompt C** in [`claudetodo.md`](./claudetodo.md) |

---

## Quick links

| Who | First task |
|-----|------------|
| **Human** | Push + SQL + smoke |
| **Grok** | S5 canvas token / S7 smoke tests / BPI |
| **Cursor** | S4 scroll or S6 shortcut gaps only |
