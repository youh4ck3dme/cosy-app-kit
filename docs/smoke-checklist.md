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

## Record (paste into progress.md)

```
Date:
Build first preview: ___ s
Edit/retry reload: OK / FAIL
Plan no artifact: OK / FAIL
Double artifact: none / yes
Notes:
```
