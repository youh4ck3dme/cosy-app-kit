# Cursor Todo — UI · Canvas · Growth (parallel world B)

> **Owner:** Cursor agents (IDE / Composer track)  
> **Sister board:** [`groktodo.md`](./groktodo.md) · **Hub:** [`todo.md`](./todo.md) · **Scores:** [`progress.md`](./progress.md)  
> **Branch:** `developeredit` only · **Never** push `main`  
> **AI rule:** Product chat is **Mistral only** — do not reintroduce OpenAI / Lovable Gateway / Gemini in chat paths  
> **Last sync:** 2026-07-20 (post M1–M6 code review)

---

## 0. Prečo táto polovica

Cursor vlastní **produktový povrch**: Canvas Pro (Monaco), message actions polish, suggestions UI, templates, onboarding, landing, share/embed UX, a11y empty/loading, Playwright e2e, visual design tokens.

Grok vlastní **agent backend** (`/api/chat`, tools, migrations for agent data, BPI samples scoring, server fns).  
**Zákaz kolízií** — pozri § Boundary.

---

## 1. Shared ground truth (oba svety)

### 1.1 Hotové v UI (neprepisovať bez dôvodu)

| Oblast | Stav | Kde |
|--------|------|-----|
| Chat shell | ✅ | `Header`, `ThreadList`, `Composer`, `MessageList`, `Canvas` |
| Cmd+K palette + `?` help | ✅ | `CommandPalette.tsx`, `use-hotkeys.ts` |
| Canvas preview/code/**simple diff**/ZIP/share | ✅ | `Canvas.tsx` (textarea, not Monaco) |
| Device presets + **420** mobile | ✅ | `Canvas.tsx` `WIDTHS` |
| Auto-refresh 400ms local edits | ✅ | `Canvas.tsx` |
| Undo stack (local edits) | ✅ | `Canvas.tsx` |
| Share panel + **embed iframe** copy | ✅ | `Canvas.tsx` |
| Image attach (Pixtral path) | ✅ | `Composer.tsx` file parts |
| Starters (4) empty state | ✅ | `src/lib/starters.ts` + MessageList |
| Skeletons thread/messages/canvas | ✅ | `chat.$threadId.tsx` |
| safe-area + reduced-motion | ✅ | `styles.css`, Header/Composer |
| Chat error/notFound boundaries | ✅ | `chat.$threadId.tsx` |
| Memory UI list add/delete | ✅ | `AgentSettingsPanel.tsx` |

### 1.2 Known UI gaps (Cursor-owned unless noted)

| ID | Severity | Issue | Owner |
|----|----------|-------|-------|
| **C-P0-1** | P0 | Edit/Retry UX exists but DB truncate is **Grok G-P0-1** — Cursor must **wire** server fn when Grok lands it | Shared |
| **C-P1-1** | P1 | Diff tab is side-by-side plain text, not Monaco DiffEditor | Cursor |
| **C-P1-2** | P1 | No version timeline UI (needs Grok `artifact_versions`) | Cursor after G2 |
| **C-P1-3** | P1 | No follow-up suggestion chips (need cheap model call — prefer Grok API or client Small) | Shared design / Cursor UI |
| **C-P2-1** | P2 | Public share mobile width **390** vs canvas **420** — unify to 420 | Cursor |
| **C-P2-2** | P2 | MessageList `artifacts` dep warning — useMemo | Cursor |
| **C-P2-3** | P2 | Palette incomplete vs mega-spec (no export ZIP from palette, no memory section) | Cursor |

---

## 2. Ownership boundary (hard)

### 2.1 Cursor **MAY** edit freely

```
src/components/app-shell/**
src/components/ai-elements/**
src/components/ui/**
src/components/templates/**          # when created
src/components/onboarding/**         # when created
src/components/palette/**            # if extracted from app-shell
src/hooks/use-hotkeys.ts
src/hooks/use-mobile.tsx
src/lib/starters.ts
src/lib/utils.ts
src/styles.css
src/routes/index.tsx
src/routes/auth.tsx                  # SEO/UI only; no auth protocol rewrite
src/routes/a.$artifactId.tsx         # public share UI
src/routes/templates.tsx             # new
src/routes/templates.$slug.tsx       # new
src/routes/_authenticated/**         # UI layout; careful with chat transport
e2e/**                               # Playwright
docs/keyboard.md
docs/cursortodo.md                   # this file
public/**
```

### 2.2 Cursor **MUST NOT** touch (Grok world)

```
src/routes/api/chat.ts
src/routes/api/ai-status.ts
src/lib/agent/**                     # tools/prompts/memory execute
src/lib/models.ts                    # routing — request Grok for model catalog UI labels only via props
src/lib/ai-gateway.server.ts
supabase/migrations/**               # except if human assigns a pure UI-supporting migration jointly
```

**Exception:** Cursor may **read** agent files for types/contracts. No silent tool behavior changes.

### 2.3 Shared files — **protocol**

| File | Rule |
|------|------|
| `chat.$threadId.tsx` | Cursor: layout, palette props, skeletons. Grok: transport, truncate wiring. Prefer small sequential commits. |
| `MessageList.tsx` | Cursor owns visual actions, chips, tool cards polish. Grok may add data-part handlers. |
| `threads.functions.ts` | **Consume only** via `useServerFn`. If you need a new shape, open a note in groktodo handoff table — do not invent server logic that duplicates tools. |
| `package.json` | You may add `@monaco-editor/react`, `prettier`, Playwright, etc. Do not remove Mistral / vitest deps. |

### 2.4 Conflict rule

Grok P0 backend first if both blocked.  
If Cursor needs a server fn: add row to **Grok handoff** in `groktodo.md` §7 and stub UI with TODO toast until ready.

---

## 3. Sprint map (Cursor) — detailed

### Sprint C0 — Wire & polish existing shell (≤ 1 session)

**Goal:** Make M1–M6 UI feel finished; zero hooks bugs; unify mobile.

#### C0.1 Unify device widths

- [x] `a.$artifactId.tsx` mobile `390` → **`420`** (match Canvas)
- [x] Optional: rotate landscape widths later

#### C0.2 Hooks / lint cleanliness (UI files)

- [x] `chat.$threadId.tsx` — `const artifacts = useMemo(() => …, [data])`
- [ ] Confirm public artifact page hooks order (Grok may have fixed `a.$artifactId.tsx` — verify)

#### C0.3 Wire Grok truncate when available

When `truncateThreadMessagesAfter` exists:

```ts
// onEditUserMessage / onRetryFrom
await truncate(...);
setMessages(...);
regenerate() | sendMessage()
```

- [x] Soft-wire via `maybeTruncateThreadMessages` (toast until Grok ships fn)
- [x] Loading toast while truncating  
- [x] Error toast if truncate fails (don’t stream on top of old history)

#### C0.4 Palette gaps (quick wins)

| Action | Behavior |
|--------|----------|
| Export ZIP | ✅ Call `exportArtifactDownload` |
| Copy share link | ✅ If public artifact active |
| Starters group | ✅ all 4 from `STARTERS` |
| Models | ✅ Switch via existing `updateThreadModel` |
| Memory | ✅ List keys read-only + “Open settings” |

**Files:** `CommandPalette.tsx`, `chat.$threadId.tsx`

#### C0.5 Keyboard.md accuracy

- [x] Keep `docs/keyboard.md` in sync with real bindings  
- [x] Note desktop-only shortcuts on mobile help modal

---

### Sprint C1 — Canvas Pro (Monaco) ✅ (2026-07-20)

**Goal:** Code tab feels like a real editor; Diff tab is Monaco DiffEditor.

#### C1.1 Monaco lazy mount

- [x] `@monaco-editor/react` + `monaco-editor`
- [x] `MonacoEditor.tsx` / `MonacoDiff.tsx` / `monaco-theme.ts`
- [x] Replace textarea; keep edits + auto-refresh + Save

#### C1.2 DiffEditor

- [x] Monaco DiffEditor + Accept / Revert (local undoStack / original)

#### C1.3 Console + Network panels

- [x] Console filter chips
- [x] Network fetch interceptor + NetworkPanel

#### C1.4 Preview UX

- [x] Fullscreen (`F`) + Esc
- [x] Custom width + `localStorage` `builder:device:{threadId}`

#### C1.5 Version timeline UI (after Grok G2)

- [ ] Deferred until Grok `artifact_versions`

#### C1.3 Console + Network panels

| Feature | Detail |
|---------|--------|
| Console filters | chips: all / log / warn / error |
| Network | inject fetch interceptor next to `CONSOLE_BRIDGE` |
| Columns | method, url (truncate), status, ms |
| Cap | last 100 network rows |

**Security**
- [ ] Confirm iframe `sandbox` without `allow-same-origin` (or document why forms need more)  
- [ ] Optional CSP meta inject in `injectBridge`  

#### C1.4 Preview UX

- [ ] Fullscreen preview (`F` when not in input) + Esc  
- [ ] Custom width input + persist `localStorage` key `builder:device:{threadId}`  
- [ ] Rotate tablet/mobile optional  

#### C1.5 Version timeline UI (after Grok G2)

- [ ] Horizontal slider or list of versions  
- [ ] Preview snapshot on hover  
- [ ] Restore confirms dialog  
- [ ] Uses `listArtifactVersions` / `restoreArtifactVersion` only  

---

### Sprint C2 — Chat UX depth

#### C2.1 Message actions complete

| Action | Status target |
|--------|----------------|
| Copy | ✅ keep |
| Retry any assistant | wire + truncate |
| Edit user | inline textarea ✅ → + truncate |
| Quote | insert `> …` into composer draft |
| Branch | **blocked** on Grok `parent_thread_id` — UI button disabled with tooltip until schema |

#### C2.2 Attachments polish

- [ ] Drag & drop overlay on Composer  
- [ ] Max 4 images; show size; reject > 4MB with toast  
- [ ] Text files `.md/.json/.csv` ≤ 200KB → read as text part (client)  
- [ ] Do **not** build Storage bucket unless Grok/human adds migration — data URLs OK for v1  

#### C2.3 Suggestion chips

**Preferred design (avoid non-Mistral):**
- Client calls a tiny server fn `suggestFollowups({ lastAssistantText })` **if Grok adds it** using `mistral-small-latest`  
- Fallback: static chips from last starter category  

**UI**
- Row under last assistant message  
- Click fills composer, does not auto-send  

#### C2.4 Tool UI polish

- [ ] `Tool` cards already in MessageList — improve labels for `create_artifact` / `edit_file`  
- [ ] On `data-artifact-created` (Grok stream part): toast + focus canvas  
- [ ] On `data-memory-saved`: toast “Remembered: {key}”  

#### C2.5 Empty / loading consistency

| Surface | Empty | Loading |
|---------|-------|---------|
| ThreadList | illustration + New chat | 5 skeletons ✅ |
| Canvas | hint + starter chip | skeleton ✅ |
| Memory | copy ✅ | skeleton rows |
| Search threads | “No matches” + clear | — |

---

### Sprint C3 — Templates + onboarding + landing

#### C3.1 Data: coordinate with Grok/human

Templates table + seed may be a **joint migration**. Prefer:

1. Cursor writes UI against mock `src/lib/templates.seed.ts` static array first  
2. Then swap to Supabase when migration lands  

**12 templates** (from original roadmap) — categories: landing / app / content / utility.

#### C3.2 Routes

```
src/routes/templates.tsx
src/routes/templates.$slug.tsx
src/components/templates/TemplateGrid.tsx
src/components/templates/TemplateCard.tsx
src/components/templates/TemplateFilter.tsx
```

**SEO `head()`**
- Unique title/description per slug  
- og:image from preview path  
- robots index on public templates  

**Use template CTA**
- Auth: `createThread` + seed prompt into composer (not auto-send)  
- Unauth: `sessionStorage.pendingTemplate` → `/auth?next=…`  

#### C3.3 Onboarding tour

```
src/components/onboarding/Tour.tsx
src/lib/onboarding.functions.ts  # markOnboarded — or ask Grok if middleware-heavy
```

- 3 steps: Composer → Canvas → Cmd+K / ThreadList  
- Skip / Next / Esc  
- `prefers-reduced-motion`: no animation  
- Gate on `profiles.onboarded_at` (migration may be needed — joint)

#### C3.4 Landing `/`

- [ ] Hero copy polish (Mistral Builder, not GPT)  
- [ ] “Made with Builder” grid of public artifacts (server fn public list — Grok or Cursor with publishable client)  
- [ ] Hide section if zero public artifacts  
- [ ] Do not put og:image on root if project rule forbids — leaf routes only for images  

---

### Sprint C4 — Share, growth, a11y, e2e

#### C4.1 Share modal v2

- [ ] Social preview card (title + fake browser chrome)  
- [ ] Copy link / Copy embed ✅ / Download ZIP ✅  
- [ ] Optional QR (`qrcode` lazy)  
- [ ] Embed route `/a/$id/embed` minimal chrome + “Made with Builder” badge  

#### C4.2 a11y pass

- [ ] Icon-only buttons all have `aria-label`  
- [ ] Message list `role="log"` `aria-live="polite"`  
- [ ] Skip-to-content already partial — ensure `#main` / `#chat-main`  
- [ ] Focus rings `focus-visible:ring-2` audit  
- [ ] Optional dev `@axe-core/react`  

**Target:** Lighthouse a11y ≥ 95 on `/`, `/auth`, `/templates`, `/a/$id`

#### C4.3 Playwright e2e (Cursor-owned)

```
e2e/chat-happy.spec.ts
e2e/plan-mode.spec.ts
e2e/share-public.spec.ts
e2e/palette.spec.ts
```

| Spec | Steps |
|------|-------|
| Happy | login fixture → new thread → prompt → wait artifact (mock or real) |
| Plan | mode Plan → assert no canvas artifact within N s / tool name absent |
| Share | public artifact URL loads iframe |
| Palette | Cmd+K opens, filter, Esc |

**CI:** only if human enables secrets; otherwise local `bunx playwright test`.

#### C4.4 Docs Cursor owns

- [ ] `docs/keyboard.md` living  
- [ ] Component story notes optional  
- [ ] Update hub `todo.md` status lines when C sprints complete  

---

## 4. File-level checklist (Cursor)

### Create

- [x] `src/components/canvas/MonacoEditor.tsx`  
- [x] `src/components/canvas/MonacoDiff.tsx`  
- [x] `src/components/canvas/monaco-theme.ts`  
- [x] `src/components/canvas/NetworkPanel.tsx`  
- [ ] `src/components/templates/*`  
- [ ] `src/components/onboarding/Tour.tsx`  
- [ ] `src/routes/templates.tsx` + `templates.$slug.tsx`  
- [ ] `src/routes/a.$artifactId.embed.tsx` (or nested)  
- [ ] `e2e/*.spec.ts`  
- [ ] `public/templates/*` previews  

### Modify heavily

- [x] `src/components/app-shell/Canvas.tsx`  
- [ ] `src/components/app-shell/MessageList.tsx`  
- [ ] `src/components/app-shell/Composer.tsx`  
- [x] `src/components/app-shell/CommandPalette.tsx`  
- [x] `src/routes/_authenticated/chat.$threadId.tsx`  
- [ ] `src/routes/index.tsx`  
- [x] `src/routes/a.$artifactId.tsx`  
- [ ] `src/styles.css`  

### Consume only (Grok APIs)

- [ ] `truncateThreadMessagesAfter`  
- [ ] `listArtifactVersions` / `restoreArtifactVersion`  
- [ ] stream data parts `data-artifact-created`, `data-memory-saved`  
- [ ] `suggestFollowups` (if shipped)  

---

## 5. Acceptance — “Cursor half done”

Cursor track hits **C★** when:

- [x] Monaco code + DiffEditor live on Canvas  
- [x] Console filters + Network panel  
- [~] Edit/retry wired to Grok truncate (soft-wire ready; waiting on Grok fn)  
- [ ] Templates index + detail SEO + Use CTA  
- [ ] First-run tour once  
- [ ] Landing shows public artifacts or hides cleanly  
- [ ] Share modal v2 + embed route  
- [ ] Playwright happy path green locally  
- [ ] a11y smoke (axe or Lighthouse) on public routes  
- [x] No regression: Plan/Build toggle, starters, 420 mobile, safe-area  

---

## 6. Daily standup template (Cursor)

```
Cursor standup:
- Done:
- Doing:
- Blocked (waiting on Grok contract?):
- Files touched:
- Visual QA (mobile 420 / desktop):
- e2e:
```

---

## 7. Handoff requests → Grok

Append when blocked:

| Date | Need | Why | Priority |
|------|------|-----|----------|
| 2026-07-20 | `truncateThreadMessagesAfter` | edit/retry integrity | ✅ Grok shipped + wired |
| 2026-07-20 | `listArtifactVersions` + restore | timeline UI | P1 |
| _optional_ | `suggestFollowups` server fn | chips without non-Mistral | P2 |
| _optional_ | `data-artifact-created` stream part | live canvas focus | P1 |

---

## 8. Explicit out of scope (Cursor)

- Changing tool `execute` implementations  
- Mistral provider / API key plumbing  
- Fence parser algorithms  
- BPI scoring math (fill scores only if human asks; Grok owns sample pipeline)  
- Force-push, rebase of published Lovable history  
- Reintroducing GPT/Gemini chat models in UI chips  

---

## 9. Design tokens / UX notes

- Keep dark OKLCH system; no random purple clichés in **our** chrome  
- Touch targets ≥ 44px (`min-h-11`) already started — extend to new buttons  
- Respect `prefers-reduced-motion` for Monaco / tour / palette  
- cmdk palette: portal, Esc, focus return  

---

## 10. OmniOps hard rules (reminder)

| Rule | |
|------|--|
| Workspace | `/Users/erikbabcan/lovable-builder-cosyapp` only |
| Branch | `developeredit` |
| `main` | locked — PR only, human merge order |
| AI product | Mistral only |
| Secrets | never commit |
| After prod | smoke `/api/ai-status` + `/chat` |
