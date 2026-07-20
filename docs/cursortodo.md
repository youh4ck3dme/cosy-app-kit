# Cursor plan A→Z — UI · Canvas · Growth

> **Pre koho:** Cursor agents (Composer / IDE)  
> **Branch:** `developeredit` **only** · **Never** `git push origin main` · **Never** force-push  
> **Hub:** [`todo.md`](./todo.md) · **Grok board:** [`groktodo.md`](./groktodo.md) · **Tools contract:** [`agent-tools.md`](./agent-tools.md)  
> **AI product:** **Mistral only** — no OpenAI / Lovable Gateway / Gemini in chat UI  
> **CI:** already green on `developeredit` (unit + typecheck + build). Do **not** add ESLint as CI gate.  
> **Last sync:** 2026-07-20 (post Grok G0+G1 + CI green)

---

## How to use this file (Cursor: read first)

1. Work **only** steps marked **READY** or **IN PROGRESS**.  
2. Skip steps marked **WAIT:Grok** until handoff says ✅.  
3. One phase per session preferred; commit on `developeredit` when a phase’s acceptance is green.  
4. After each phase: `bunx tsc --noEmit` (and `bun test` if you touch shared pure helpers — rare).  
5. Update the **Progress tracker** (§ bottom) when a letter is done.

```text
START → A → B → C → D → E → F → G → H → I → J → K → L → C★ DONE
         ↑                    ↑
    can start now      wait Grok G2 for version timeline
```

---

## 0. Ground rules (non-negotiable)

| Rule | |
|------|--|
| Workspace | `/Users/erikbabcan/lovable-builder-cosyapp` only |
| Branch | `developeredit` |
| `main` | locked — human merges via PR only |
| Grok files | **do not edit** (see § MUST NOT) |
| Consume only | `useServerFn(...)`, stream `data-*` parts, tool result fields |
| Secrets | never commit |
| Lint | fix what you touch; no mass prettier rewrite of whole repo |

### MUST edit freely

```
src/components/app-shell/**
src/components/ai-elements/**
src/components/ui/**
src/components/canvas/**          # create (Monaco)
src/components/templates/**       # create
src/components/onboarding/**      # create
src/hooks/**
src/lib/starters.ts
src/lib/export-artifact.ts
src/lib/utils.ts
src/styles.css
src/routes/index.tsx
src/routes/auth.tsx               # SEO / UI only
src/routes/a.$artifactId.tsx
src/routes/a.$artifactId.embed.tsx   # create
src/routes/templates*.tsx         # create
src/routes/_authenticated/**      # UI careful — don't rip transport
e2e/**
docs/keyboard.md
docs/cursortodo.md
public/**
```

### MUST NOT touch

```
src/routes/api/chat.ts
src/routes/api/ai-status.ts
src/lib/agent/**
src/lib/models.ts
src/lib/ai-gateway.server.ts
supabase/migrations/**
```

### Shared (small patches only)

| File | You may |
|------|---------|
| `chat.$threadId.tsx` | palette props, canvas focus on `data-artifact-created`, layout, suggestions UI |
| `MessageList.tsx` | chips, tool cards, quote, actions polish |
| `threads.functions.ts` | **read / call only** — never invent tools execute logic |

---

## 1. What is already DONE (do not rebuild)

| Area | Status | Notes |
|------|--------|--------|
| Auth shell, threads, streaming chat | ✅ | Mistral hybrid + fence |
| Grok G0: truncate edit/retry | ✅ | `truncateThreadMessagesAfter` wired |
| Grok G1: tools, fetch/web flags, stream data parts | ✅ | toasts partial on `onData` |
| Canvas preview/code/simple diff, ZIP, share embed copy | ✅ | textarea code view |
| Device **420**, safe-area, reduced-motion | ✅ | |
| Cmd+K palette, starters, image attach, memory UI | ✅ | polish still open |
| Chat error/notFound, skeletons | ✅ | |
| CI unit+typecheck+build on `developeredit` | ✅ | |

### Grok contracts ready for you

| Contract | Where | Use for |
|----------|--------|---------|
| `truncateThreadMessagesAfter` | `threads.functions` | already wired — don't break |
| `data-artifact-created` | stream `onData` | **focus canvas + select artifact** |
| `data-memory-saved` | stream | toast (exists) |
| `data-plan` | stream | optional plan card |
| `edit_file` → `beforeSnippet` / `afterSnippet` | tool output | Monaco DiffEditor |
| `exportArtifactDownload` | `lib/export-artifact.ts` | palette Export ZIP |
| `STARTERS` | `lib/starters.ts` | empty state / palette |
| Docs | `docs/agent-tools.md` | tool UX labels |

### Grok contracts for later phases

| Contract | Status | Needed for |
|----------|--------|------------|
| `listArtifactVersions` / `restoreArtifactVersion` | ✅ **G2 ready** (after SQL migration applied) | **H** version timeline |
| `suggestFollowups` server fn (optional) | ⏳ optional | **E** chips — static fallback first |

---

## 2. A→Z execution plan

---

### **A — Orient & smoke-safe UI** · READY · ~30 min

**Goal:** Confirm branch health; zero regressions before big UI.

**Do**
1. `git status` / pull `developeredit`.  
2. `bun test` + `bunx tsc --noEmit` (expect green).  
3. Manual smoke in browser (or leave for human): edit/retry, Build artifact, Plan no code.  
4. Read `docs/agent-tools.md` once.

**Acceptance**
- [ ] typecheck green  
- [ ] no edits to `src/lib/agent/**` or `api/chat.ts`

---

### **B — Unify & tidy (quick wins)** · READY · ~1 h

**Goal:** Kill P2 polish debt.

| Task | Detail |
|------|--------|
| B1 | `a.$artifactId.tsx` mobile width **390 → 420** (match Canvas) |
| B2 | `chat.$threadId.tsx`: wrap `artifacts` in `useMemo` (hooks warning) |
| B3 | Confirm hooks order on public artifact page (no conditional hooks) |
| B4 | Icon buttons: missing `aria-label` pass on Header / Canvas / MessageList |

**Files:** `a.$artifactId.tsx`, `chat.$threadId.tsx`, shell components  
**Acceptance:** tsc clean; 420 everywhere; no hooks lint on those files.

---

### **C — Command palette complete** · READY · ~2 h

**Goal:** Power-user palette matches keyboard.md.

| Task | Behavior |
|------|----------|
| C1 | **Export ZIP** → call `exportArtifactDownload(activeArtifact)` (prop from chat page) |
| C2 | **Copy share link** if artifact public |
| C3 | All 4 `STARTERS` group (not only 3) |
| C4 | Models → existing `updateThreadModel` |
| C5 | Memory → “Open settings” (no duplicate CRUD) |
| C6 | Sync `docs/keyboard.md` with real bindings |

**Files:** `CommandPalette.tsx`, `chat.$threadId.tsx`, `keyboard.md`  
**Acceptance:** Cmd+K can export + switch model + pick starter without mouse on rest of UI.

---

### **D — Stream UX: artifact focus** · READY · ~1 h

**Goal:** When Grok emits `data-artifact-created`, user *sees* canvas.

**Do**
1. In `chat.$threadId.tsx` `onData` for `data-artifact-created`:  
   - `setActiveArtifactId(artifactId)`  
   - `setView("preview")` on mobile  
   - keep toast  
2. Optional: highlight tool card in MessageList when `create_artifact` succeeds.

**Files:** `chat.$threadId.tsx`, maybe `MessageList.tsx`  
**Acceptance:** tool create → canvas jumps to new artifact without full reload wait.

---

### **E — Chat UX depth** · READY (static chips) / WAIT optional API · ~3 h

**Goal:** Message actions + suggestions feel finished.

| Task | Detail |
|------|--------|
| E1 | **Quote** → insert `> …` into composer draft (lift draft state or callback) |
| E2 | Tool cards labels from `agent-tools.md` (create / edit / remember…) |
| E3 | **Suggestion chips** under last assistant: static 3 prompts from starters **or** call `suggestFollowups` |
| E4 | Grok shipped `suggestFollowups({ lastAssistantText })` → `{ suggestions, source }`. Optional: try API, fallback static |
| E5 | Drag-and-drop images on Composer (max 4, size toast) — data URLs OK |
| E6 | Branch button: disabled + tooltip “Coming soon” (needs Grok schema) |

**Do not** build Storage bucket or non-Mistral models.  
**Acceptance:** quote works; chips fill composer; drop image works; no GPT chips.

---

### **F — Canvas Pro: Monaco** · READY · ~1 day

**Goal:** Code tab = real editor.

**Deps:** `@monaco-editor/react` (+ peer as needed). Lazy + client-only (no SSR `window`).

**Create**
```
src/components/canvas/MonacoEditor.tsx
src/components/canvas/monaco-theme.ts
```

**Do**
1. Replace Canvas **code** textarea with Monaco.  
2. Languages: html, css, js, ts, json, markdown.  
3. Minimap off `< md`.  
4. Keep `edits` map + Save → `updateArtifactFiles`.  
5. Keep 400ms auto-refresh preview.

**Acceptance**
- [ ] Multi-file tabs switch without full Canvas remount crash  
- [ ] Save + preview refresh work  
- [ ] No hydration error on `/chat/$id`  
- [ ] `bun run build` green  

---

### **G — Canvas DiffEditor** · READY · ~4 h

**Goal:** Diff tab uses Monaco Diff + tool snippets.

**Create:** `src/components/canvas/MonacoDiff.tsx`

**Do**
1. Diff tab: original vs local edit (existing).  
2. When tool `edit_file` returns `beforeSnippet`/`afterSnippet` (from tool parts in messages), offer “Show model change” Diff.  
3. Buttons: Accept (dismiss) / Revert (restore via `updateArtifactFiles` or undo stack).  
4. Until Grok versions: client `undoStack` is enough.

**Acceptance:** after model edit, user can see before/after in Diff tab.

---

### **H — Version timeline** · READY (G2 code) · needs migration applied · ~4 h

**Server fns (Grok shipped):**
```ts
useServerFn(listArtifactVersions)  // { data: { artifactId, limit? } }
useServerFn(restoreArtifactVersion) // { data: { versionId } }
```
See `docs/agent-tools.md` § Artifact versions.

**If queries 404 / relation missing:** human must apply  
`supabase/migrations/20260720120000_artifact_versions.sql` on the project.

**Do**
1. Timeline list/slider in Canvas header (newest first).  
2. Show `source` badge: tool / fence / user_save / restore.  
3. Restore confirm dialog → `restoreArtifactVersion` → invalidate thread.  
4. Empty state: “No versions yet — save or let the agent edit.”

---

### **I — Console + Network + preview UX** · READY · ~3 h

| Task | Detail |
|------|--------|
| I1 | Console filter chips: all / log / warn / error |
| I2 | Network: inject fetch interceptor next to `CONSOLE_BRIDGE` |
| I3 | Fullscreen preview (`F` outside inputs) + Esc |
| I4 | Custom width input + `localStorage` `builder:device:{threadId}` |
| I5 | Confirm iframe sandbox (document choice in comment) |

**Acceptance:** filters work; network shows ≥1 fetch from sample HTML; fullscreen OK.

---

### **J — Templates + onboarding + landing** · READY (static first) · ~1–2 days

**Strategy:** static seed first → Supabase later if human adds migration.

**Create**
```
src/lib/templates.seed.ts          # 8–12 templates offline
src/routes/templates.tsx
src/routes/templates.$slug.tsx
src/components/templates/*
src/components/onboarding/Tour.tsx
```

**Do**
1. `/templates` grid + category chips + SEO `head()`.  
2. `/templates/$slug` detail + “Use template” → createThread + seed prompt in composer (**not** auto-send).  
3. Unauth: `sessionStorage` + redirect auth.  
4. Tour 3 steps: Composer → Canvas → Cmd+K (once; localStorage if no `onboarded_at`).  
5. Landing `/`: “Made with Builder” — hide if no public artifacts; don’t invent og:image on root if project forbids.

**Acceptance:** SEO titles unique; Use template lands on chat with prompt; tour once.

---

### **K — Share v2 + embed route + a11y** · READY · ~1 day

| Task | Detail |
|------|--------|
| K1 | Share modal: preview card, copy link, copy embed, ZIP |
| K2 | Route `/a/$id/embed` — minimal chrome + “Made with Builder” |
| K3 | Optional QR lazy (`qrcode`) |
| K4 | a11y: `role="log"` messages, skip-link, focus-visible audit |
| K5 | Empty states: ThreadList / Canvas / memory consistency |

**Acceptance:** public share + embed loads; Lighthouse a11y stretch goal ≥90 public routes (best effort).

---

### **L — Playwright e2e (local only)** · READY after A–G stable · ~4 h

**Do not** wire into CI yet (secrets / noise).

```
e2e/chat-smoke.spec.ts      # optional auth fixture
e2e/palette.spec.ts
e2e/share-public.spec.ts
```

| Spec | Assert |
|------|--------|
| Palette | Cmd+K opens, Esc closes |
| Share | public `/a/$id` 200 if fixture exists |
| Plan | soft: mode toggle visible |

**Acceptance:** `bunx playwright test` green locally when deps installed.

---

## 3. Definition of done — **C★**

Cursor track is complete when:

- [ ] **B–G** shipped (Monaco + Diff + focus + palette)  
- [ ] **I** console/network/fullscreen  
- [ ] **J** templates + tour + landing section  
- [ ] **K** share/embed + a11y pass  
- [ ] **H** timeline if Grok G2 ready (else documented blocked)  
- [ ] **L** local e2e optional but preferred  
- [ ] No OpenAI/Gemini reintroduced  
- [ ] `developeredit` CI still green  
- [ ] `main` never force-pushed  

---

## 4. Session playbooks (copy-paste to Cursor)

### Session 1 — letters A+B+C+D
```
You are Cursor on OmniOps Builder.
Branch: developeredit only. Never push main.
Read docs/cursortodo.md and execute phases A→D only.
Do not edit src/lib/agent/** or src/routes/api/chat.ts.
Run tsc --noEmit when done. Summarize files changed.
```

### Session 2 — letter E
```
Execute docs/cursortodo.md phase E only (chat UX depth).
Static suggestion chips OK. Mistral only. No new AI providers.
```

### Session 3 — letters F+G
```
Execute docs/cursortodo.md phases F and G (Monaco + DiffEditor).
Use edit_file beforeSnippet/afterSnippet from tool outputs when present.
Ensure SSR-safe lazy Monaco. bun run build must pass.
```

### Session 4 — letter I
```
Execute phase I only: console filters, network interceptor, fullscreen, device localStorage.
```

### Session 5 — letter J
```
Execute phase J: static templates seed, routes, tour, landing section.
No Supabase migration unless human provides it — use templates.seed.ts.
```

### Session 6 — letter K (+ L if time)
```
Execute phase K share/embed/a11y. Optional L Playwright local only, not CI.
```

### Session 7 — letter H (G2 ready)
```
Execute docs/cursortodo.md phase H: version timeline.
Use listArtifactVersions + restoreArtifactVersion from threads.functions.
If DB errors about missing table, note that migration 20260720120000 must be applied — do not invent schema.
```

---

## 5. Handoff log (update when blocked / unblocked)

| Date | From | Item | Status |
|------|------|------|--------|
| 2026-07-20 | Grok | truncate + stream data parts + edit snippets | ✅ ready |
| 2026-07-20 | Grok | CI green on developeredit | ✅ |
| 2026-07-20 | Grok | `listArtifactVersions` / restore + migration | ✅ for **H** (apply SQL) |
| 2026-07-20 | Grok | `suggestFollowups` server fn | ✅ optional for **E** |
| — | Human | live smoke + BPI samples | parallel, not Cursor |

---

## 6. Progress tracker (Cursor updates this)

| Letter | Name | Status | Date | Notes |
|--------|------|--------|------|-------|
| A | Orient | ✅ | 2026-07-20 | test + tsc green; agent-tools read |
| B | Unify & tidy | ✅ | 2026-07-20 | 420 already; artifacts useMemo; aria-labels |
| C | Palette complete | ✅ | 2026-07-20 | Export ZIP, share link, 4 starters, model, memory |
| D | Artifact focus | ✅ | 2026-07-20 | onData → setActiveArtifactId + setView(preview) |
| E | Chat UX depth | ✅ | 2026-07-20 | quote, tool labels, chips fill, DnD images, Branch stub |
| F | Monaco | ✅ | 2026-07-20 | lazy + mount gate; edits/Save/400ms kept |
| G | DiffEditor | ✅ | 2026-07-20 | local undo + edit_file before/after snippets |
| H | Versions UI | ☐ READY | | needs migration apply |
| I | Console/Network | ☐ | | |
| J | Templates/Tour | ☐ | | |
| K | Share/a11y | ☐ | | |
| L | Playwright local | ☐ | | |
| **C★** | Done | ☐ | | |

---

## 7. Explicit out of scope (Cursor)

- Changing tool `execute` / fence parser / model routing  
- BPI scoring math / sample HTML generation pipeline (Grok + human)  
- Billing, collab, voice, public API  
- ESLint-as-CI gate  
- Pushing or merging `main`  

---

## 8. OmniOps reminder

| | |
|--|--|
| After any deploy | human smokes `/api/ai-status` + `/chat` |
| PR to main | only on explicit human order |
| Parallel | Grok does G2/G3 while you do **B→G** now |

**First command for Cursor:** start at **A**, then **B → C → D** without waiting for Grok.
