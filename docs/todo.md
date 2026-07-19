# Builder roadmap hub (OmniOps · Mistral)

> **Status 2026-07-20:** Happy-path pipeline works (chat → Mistral → canvas).  
> M1–M6 hybrid agent is **in code** on `developeredit` (mostly uncommitted at last audit).  
> Roadmap is split into **two parallel worlds** so Grok and Cursor agents do not collide.

---

## Parallel worlds (read your file only)

| World | File | Owner | Focus |
|-------|------|-------|--------|
| **A** | **[`groktodo.md`](./groktodo.md)** | **Grok** | `/api/chat`, tools, prompts, memory, migrations, Vitest agent, BPI samples, P0 persist bugs |
| **B** | **[`cursortodo.md`](./cursortodo.md)** | **Cursor** | Canvas Monaco, chat UX polish, templates, onboarding, landing, share UI, Playwright, a11y |

**Shared scoreboard:** [`progress.md`](./progress.md)  
**Architecture:** [`architecture.md`](./architecture.md)  
**Keyboard:** [`keyboard.md`](./keyboard.md)  
**Samples:** [`samples/2026-07/`](./samples/2026-07/)

---

## Rules of engagement

1. **One world per agent session** — do not “helpfully” implement the other half.  
2. **Hard file boundaries** are listed in each world file § Ownership boundary.  
3. **Shared files** (`chat.$threadId.tsx`, `MessageList.tsx`, `threads.functions.ts`):  
   - Grok adds server contracts first when both need them.  
   - Cursor consumes via `useServerFn` / stream data parts.  
4. **Branch:** `developeredit` only. **`main` locked** — PR + human merge order.  
5. **AI:** product chat = **Mistral only** (no OpenAI / Lovable Gateway / Gemini).  
6. **Secrets:** never commit keys.  
7. After prod deploy: smoke `/api/ai-status` + `/chat`.

---

## Where we stand (both worlds)

### Done (platform slice M1–M6)

- Auth, threads, messages, artifacts, `thread_memory`, agent_settings  
- Streaming chat via **direct Mistral** + hybrid tools + fence fallback  
- Plan vs Build tool split; Codestral Build routing; anti-cliché prompts  
- Canvas preview/code/simple diff, ZIP, share+embed, device 420, undo local  
- Cmd+K palette, starters (4), image attach, memory UI, skeletons  
- Chat error/notFound, safe-area, reduced-motion  
- Vitest 9 tests, expanded `/api/ai-status`

### Open P0 (coordinate)

| ID | Issue | Primary | Secondary |
|----|-------|---------|-----------|
| G-P0-1 | Edit/retry does not delete DB messages | ✅ G0 shipped (`truncateThreadMessagesAfter`) | wired in chat page |
| G-P1-1 | Fence + tool double artifact | ✅ G0 shipped (`shouldFenceArtifacts`) | — |
| G-P1-2 | Tool-only empty assistant persist | ✅ G0 shipped (tool summary fallback) | — |
| C-P1-1 | Monaco / real DiffEditor | Cursor | — |
| Live BPI | Sample regen + real scores | Grok process | Human browser |

### Backlog themes (see world files for sprints)

| Theme | World |
|-------|--------|
| Truncate + versions + web/fetch tools | Grok G0–G2 |
| Monaco Canvas Pro + network panel | Cursor C1 |
| Templates + tour + landing gallery | Cursor C3 |
| Share embed route + a11y + Playwright | Cursor C4 |
| Public API / billing / collab / voice | Post-1.0 (either, human prioritizes) |

---

## Suggested parallel schedule

```text
Week N
  Grok:  G0 stabilize (truncate, de-dupe fence, persist tools) → commit M1–M6
  Cursor: C0 polish (420 unify, palette, wire truncate when ready)

Week N+1
  Grok:  G1 tool depth + optional web/fetch flags + stream data parts
  Cursor: C1 Monaco + DiffEditor + console filters

Week N+2
  Grok:  G2 artifact_versions migration + list/restore fns + live samples BPI
  Cursor: C2 message actions + suggestions UI + tool toasts

Week N+3
  Grok:  G3 tests ≥20 + health + prompt_rev
  Cursor: C3 templates + tour + landing

Week N+4
  Grok:  prod smoke / docs/agent-tools.md
  Cursor: C4 share v2 + Playwright + a11y pass
```

---

## Definition of “Builder 1.0-ready” (both worlds green)

- [ ] Grok **G★** acceptance (`groktodo.md` §5)  
- [ ] Cursor **C★** acceptance (`cursortodo.md` §5)  
- [ ] BPI measured (not estimated) in `progress.md`  
- [ ] `developeredit` committed; PR reviewed; human merges `main`  
- [ ] Prod `/api/ai-status` ok + manual chat smoke  

---

## Obsolete content removed from this hub

The previous mega-prompt archive and OpenAI/Gemini-oriented phase text lived in the old monolithic `todo.md`.  
**Source of truth for work is now only:**

- `docs/groktodo.md`  
- `docs/cursortodo.md`  

If you need the historical phase essays, recover from git history before this split.

---

## Quick links for agents

| If you are… | Start here | First task |
|-------------|------------|------------|
| **Grok** | [groktodo.md](./groktodo.md) | Sprint **G0** (P0 persist) |
| **Cursor** | [cursortodo.md](./cursortodo.md) | Sprint **C0+C1 done** (Monaco); next C2 when Grok truncate ships |
| **Human** | this file + [progress.md](./progress.md) | Live Build/Plan smoke + commit order |
