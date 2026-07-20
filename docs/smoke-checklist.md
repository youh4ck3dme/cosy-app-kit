# Manual smoke checklist (human · ~15–20 min)

**Branch:** `developeredit` · **After:** Cursor A–D + Grok G0–G2  
**Goal:** Catch what unit tests miss (RLS, stream, DB truncate, Plan vs Build).

## Prep

- [ ] `bun run dev` with `.env.local` (`MISTRAL_API_KEY`, Supabase)
- [ ] Signed in
- [ ] Optional: apply migration `20260720120000_artifact_versions.sql` (needed for version timeline later)

## 1. Health

- [ ] `GET /api/ai-status` → `ok: true`, `mistralKeyPresent: true`, `lovableGatewayDisabled: true`
- [ ] Tools list includes create/edit/read/remember/plan (and optional fetch/web)

## 1b. Mobile Chat | Preview (Mission A)

- [ ] On a phone / narrow viewport: Chat stays visible after artifact create (no auto-jump to Preview)
- [ ] Header shows **Chat | Preview** without opening the hamburger
- [ ] Artifact pill / toast → Preview opens canvas; Chat tab returns to messages

## 1c. Multi-page canvas (Mission B · LMAP)

- [ ] Build: *multi-page web Home/About/Contact/Pricing…* → tool `launch_site` / Launch multi-page site
- [ ] Artifact has 4 HTML files (+ optional `blueprint.json`); canvas shows **N pages** label
- [ ] Desktop: page chips (Home / About / …); active = current preview; click swaps preview
- [ ] Mobile (~390): page **select** picker works; Preview stays usable
- [ ] Click in-preview About/Contact nav → page changes (Phase 1 bridge)
- [ ] Single-file HTML artifact: **no** page chip strip / picker chrome

## 1d. Console → Fix in chat

- [ ] Break preview JS or open Console; real errors show (not only empty)
- [ ] **Fix in chat** / wand fills composer with console errors (+ file hint)
- [ ] Send → agent edits; preview errors clear or reduce

## 2. Build mode

- [ ] New chat → starter or: *dark ops dashboard Chart.js Week/Month/Year*
- [ ] First preview appears (fence and/or tool)
- [ ] **Only one** new artifact for that turn (no double fence+tool)
- [ ] Canvas focuses new artifact after `create_artifact` (Cursor D)
- [ ] Export ZIP / share panel opens

## 3. Edit / retry (Grok G0)

- [ ] Edit an older user message → send new text
- [ ] **Reload page** → history matches (no zombie assistants below)
- [ ] Retry last assistant → reload → no duplicates

## 4. Plan mode

- [ ] Toggle Plan (Cmd+/)
- [ ] Prompt: *plan a todo app with localStorage*
- [ ] Response is plan / steps — **no** full HTML artifact created
- [ ] Switch back to Build works

## 5. Palette / polish (Cursor C)

- [ ] Cmd+K → Export ZIP / model switch / starter
- [ ] `?` shortcuts help, Esc closes

## 6. Mobile quick

- [ ] Viewport ~420: composer safe-area, touch targets OK
- [ ] Artifact → preview view on small screen

## 7. Mobile preview (MR-40 M1–M3)

- [ ] Narrow viewport: default preview mode **Fluid** (or phone)
- [ ] Device toggles visible: Fluid · Mobile · Tablet · Desktop
- [ ] **Desktop** on phone shows scaled layout + badge with `media 1200` / `sim`
- [ ] **Fluid** uses real host width (honest phone MQ)
- [ ] HTML chrome shows **m##** responsive score badge
- [ ] Low score → toast once; **Mobile-first** chip sends polish turn (Build mode)
- [ ] New gen dashboard: no horizontal scroll; sidebar/hamburger closed by default @390

## Record (paste into progress.md)

```
Date:
Build first preview: ___ s
Edit/retry reload: OK / FAIL
Plan no artifact: OK / FAIL
Double artifact: none / yes
Notes:
```
