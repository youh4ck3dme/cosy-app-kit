# Builder roadmap hub (OmniOps · Mistral)

> **Status 2026-07-20 (finalized):** Product line = **`developeredit` only** · pushed.  
> **Grok G0–G2** + **Cursor C★** + **Claude S1–S7 + viewport-lock** + **MR-40** + storage polyfill.  
> Boards: [`groktodo.md`](./groktodo.md) · [`cursortodo.md`](./cursortodo.md) · [`claudetodo.md`](./claudetodo.md) · Claude inventory [`claude-pr3-port.md`](./claude-pr3-port.md)

---

## Three parallel tracks (same branch)

| Track | Board | Focus now |
|-------|-------|-----------|
| **Grok** | [`groktodo.md`](./groktodo.md) | Idle / BPI after human smoke; optional light-mode port help |
| **Cursor** | [`cursortodo.md`](./cursortodo.md) | **C★ closed** — bugfix only |
| **Claude port** | [`claudetodo.md`](./claudetodo.md) | **Program closed** · optional **S10 light mode** · human SQL/smoke |

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
| Optimistic threads (Claude S3) | ✅ |
| Stick-to-bottom + Esc gaps (S4/S6) | ✅ |
| Canvas token + smoke (S5/S7) | ✅ |
| MR-40 mobile frame + gate + polish | ✅ |
| Sandbox localStorage polyfill | ✅ |
| LAN OAuth bridge | ✅ |
| iOS viewport lock (chat shell) | ✅ |
| Vitest | 87+ |

---

## Human next — **kedy** (detail: [`HUMAN_NOW.md`](./HUMAN_NOW.md))

| # | Akcia | Kedy |
|---|--------|------|
| 1 | `git push origin developeredit` | ✅ done (keep pushing after commits) |
| 2 | SQL `20260720120000` | Pred restore versions |
| 3 | Smoke checklist | Pred demom |
| 4 | Lovable Publish | Aby prod mal polyfill / LAN OAuth |
| 5 | BPI samples | Keď chceš skóre v progress.md |
| 6 | Optional: Claude **light mode** | Pozri `claude-pr3-port.md` S10 |

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
| **Human** | SQL + smoke + Publish |
| **Grok** | Optional BPI / light mode if ordered |
| **Cursor** | Idle unless UI bugfix |
