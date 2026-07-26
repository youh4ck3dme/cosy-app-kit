# MEGA PROMPT — Cursor agent (UI · canvas · shell)

> **Ako použiť:** skopíruj celý blok „PROMPT“ do **Cursor** session v  
> `/Users/erikbabcan/lovable-builder-cosyapp` na branch **`developeredit`**.

---

## PROMPT

```
You are the Cursor UI track on Cosyapp Builder (Lovable-connected React app).

## Hard rules
- Workspace: /Users/erikbabcan/lovable-builder-cosyapp ONLY
- Branch: developeredit ONLY — never git push origin main, never force-push, never rewrite published history
- Product AI is Mistral-only on the backend — do NOT add OpenAI / Lovable Gateway / Gemini client calls for chat
- Secrets: never commit .env keys
- Read first: AGENTS.md, docs/todo.md, docs/cursortodo.md, docs/agent-tools.md
- Do NOT full-merge Claude branches; cherry-pick only if human asks a specific file

## Product loop (what users feel)
sign-in → /chat brief → Build → artifact on canvas → iterate → export/share

We are NOT building an agent-studio (no tool-graph UI, no personality editor, no CLI agent generator).

## Already shipped — do not regress
- MessageList: incomplete ```html fences show Building progress card; complete fences → Artifact pill (no Streamdown freeze dump)
- chat.$threadId: mobile does NOT auto setView("preview") on artifact create (chat stays visible)
- Auth: /auth pending shell matches bridge shell (hydration fixed)
- Router: startTransition pin (ignore Transitioner setState race)
- Phase 1 multi-file preview nav works when artifact has multiple HTML files
- C★ Cursor A→Z already closed — bugfix + polish only unless human opens a new letter

## Your ownership (Cursor)
MAY edit freely:
  src/components/app-shell/**   (except do not rewrite agent execute)
  src/components/canvas/**
  src/components/ai-elements/**
  src/routes/_authenticated/chat*.tsx  (UI/state only; coordinate if touching stream transport)
  src/routes/a.$artifactId*.tsx
  src/lib/preview-nav.ts, preview-bridge.ts, preview-frame.ts, export-artifact.ts
  e2e/**, docs/cursortodo.md, docs/smoke-checklist.md

MUST NOT rewrite (Grok owns — only tiny glue if agreed):
  src/lib/agent/** execute paths
  src/routes/api/chat.ts core agent loop
  src/lib/launch/** (when Grok adds LMAP — consume results, don’t reimplement pipeline)
  Supabase migrations inventing new schema

## Current mission (pick by human message)

### Mission A — Stabilize UI after recent fixes (default if no LMAP yet)
1) Hard-refresh assumptions: verify UX copy/layout for BuildingArtifactCard + Artifact pill on mobile + desktop
2) Ensure Header Chat | Preview toggle is obvious on mobile after artifact
3) Canvas: multi-file tab/file switch still works; empty/error states clear
4) /auth form: no layout jump, loading shell consistent
5) Fix any UI regression only — no drive-by refactors
6) bunx tsc --noEmit; if you touch pure helpers run bun test; optional PLAYWRIGHT_WEB_SERVER=0 bun run test:e2e against local :8080
7) Commit on developeredit; push origin developeredit

Acceptance Mission A:
- No console hydration on /auth
- No “chat vanished” on mobile after build (user can stay on Chat)
- Building card visible while long HTML streams (if you can reproduce with mock long message in Story/dev — optional)
- e2e public routes still pass

### Mission B — After Grok ships launch_site (WAIT until human says LMAP landed)
1) Canvas multi-file: file list / tabs for index.html about.html contact.html pricing.html
2) Preview nav clicks swap srcDoc (Phase 1) — polish labels, active file, mobile file picker
3) If tool returns timings, optional subtle status (“4 pages ready · X.Xs”) — no fake progress if not streamed
4) Do NOT invent /api/launch UI or Launch mode chip unless human asks
5) Update smoke-checklist with multi-page steps
6) e2e smoke if feasible without auth secrets; else document manual steps

Acceptance Mission B:
- User can open multi-page artifact and navigate pages on canvas + share routes if applicable
- No break of single-file HTML artifacts

### Mission C — Explicitly out of scope
- LMAP blueprint/LLM orchestration (Grok)
- Changing Mistral models / tool execute
- WordPress, multi-channel deploy
- Mass prettier / ESLint-as-CI
- PR merge to main

## Coordination
- If you need a new stream data part or tool field → stop and list it for Grok; don’t hack parallel APIs
- If agent creates wrong files shape → file a note; fix display defensively only

## Report format
- Mission A/B/C
- Files changed
- Screenshots or repro steps if UI
- Tests run
- Commit SHA + push status
- Blockers for Grok / human
```

---

## Poznámka pre teba (human)

| Kedy | Čo dať Cursorovi |
|------|------------------|
| Teraz (pred LMAP) | **Mission A** — UI stabilita |
| Po Grok LMAP | **Mission B** — multi-page canvas polish |
| Nikdy bez opýtania | Mission C veci |

Odporúčané poradie session:
1. **Ty:** manuálny Build smoke  
2. **Cursor:** MEGA_PROMPT Mission A (ak treba polish)  
3. **Grok:** MEGA_PROMPT po „smoke OK“ → LMAP  
4. **Cursor:** Mission B multi-page UI  
