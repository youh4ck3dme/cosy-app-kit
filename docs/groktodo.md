# Grok Todo — Backend · Agent · Quality (parallel world A)

> **Owner:** Grok (this agent / OmniOps backend track)  
> **Sister board:** [`cursortodo.md`](./cursortodo.md) · **Hub:** [`todo.md`](./todo.md) · **Scores:** [`progress.md`](./progress.md)  
> **Branch:** `developeredit` only · **Never** push `main`  
> **AI rule:** Mistral only — no OpenAI / Lovable AI Gateway / Gemini for product chat  
> **Last sync:** 2026-07-20 (post M1–M6 code review)

---

## 0. Prečo táto polovica

Grok vlastní **mozog a dátovú cestu**: `/api/chat`, tools, prompty, memory, persistencia, model routing, testy agent vrstvy, BPI meranie, sample export skripty, server correctness.

Cursor vlastní **UI plátno a produktový povrch** (Monaco, templates routes, landing, onboarding tour, Playwright UI e2e).  
**Zákaz kolízií** — pozri § Boundary.

---

## 1. Shared ground truth (oba svety)

### 1.1 Hotové (neotvárať znova bez dôvodu)

| Oblast | Stav | Kde |
|--------|------|-----|
| Fence + hybrid tools | ✅ | `src/routes/api/chat.ts`, `src/lib/agent/tools.ts` |
| Plan/Build tool split | ✅ | `buildTools({ mode })` |
| Memory load → system | ✅ | `src/lib/agent/memory.ts` + `composeSystem` |
| Codestral Build routing | ✅ | `src/lib/models.ts` `resolveModelForMode` |
| Anti-cliché system prompt | ✅ | `DEFAULT_SYSTEM_PROMPT` |
| Fence parser + 9 unit tests | ✅ | `src/lib/agent/artifacts*.ts` |
| Error classify helpers | ✅ | `src/lib/agent/error-handling.ts` |
| `/api/ai-status` hybrid marker | ✅ | `src/routes/api/ai-status.ts` |
| Context trim (24 msgs) | ✅ | `chat.ts` `MAX_CONTEXT_MESSAGES` |

### 1.2 Otvorené P0/P1 z 200% auditu (Grok-owned)

| ID | Severity | Issue | Fix outline |
|----|----------|-------|-------------|
| **G-P0-1** | P0 | ✅ **Shipped G0** — `truncateThreadMessagesAfter` + client wire | Server fn + `chat.$threadId` edit/retry |
| **G-P1-1** | P1 | ✅ **Shipped G0** — skip fence when tool created artifact | `shouldFenceArtifacts` in `finish.ts` / `chat.ts` |
| **G-P1-2** | P1 | ✅ **Shipped G0** — tool summary when empty text | `summarizeToolResults` in `persistAssistant` |
| **G-P2-1** | P2 | `stopWhen: 25` vs roadmap 50 | Tuning po live latency; default nechať 25, Plan 12 |
| **G-P2-2** | P2 | `ai-status` root REST probe bol flaky | Fixed: non-5xx = reachable; re-verify after deploy |

---

## 2. Ownership boundary (hard)

### 2.1 Grok **MAY** edit freely

```
src/routes/api/chat.ts
src/routes/api/ai-status.ts
src/lib/agent/**
src/lib/models.ts
src/lib/ai-gateway.server.ts
src/lib/threads.functions.ts          # server fns only; coordinate if Cursor needs new shape
src/integrations/supabase/**          # types, middleware, server client — careful
supabase/migrations/**                # new tables/indexes Grok owns for agent data
src/lib/agent/*.test.ts
vitest.config.ts
docs/progress.md                      # BPI numbers after live gen
docs/samples/**
docs/architecture.md                  # agent/API sections
docs/groktodo.md                      # this file
```

### 2.2 Grok **MUST NOT** touch (Cursor world)

```
src/components/app-shell/Canvas.tsx     # Monaco / DiffEditor UI
src/components/**/Monaco*               # if created
src/routes/templates*.tsx
src/components/templates/**
src/components/onboarding/**
src/routes/index.tsx                    # landing “Made with Builder”
Playwright e2e specs (e2e/**)
src/styles.css token play (unless Grok needs 1-line fix — ask)
```

### 2.3 Shared files — **protocol**

| File | Rule |
|------|------|
| `src/routes/_authenticated/chat.$threadId.tsx` | Grok: wire server fns (truncate, tool data). Cursor: palette/layout. **One owner per PR**; other waits or small coordinated patch. |
| `src/components/app-shell/MessageList.tsx` | Grok: tool-result toasts / error banners logic. Cursor: visual actions, suggestions chips. |
| `src/components/app-shell/AgentSettingsPanel.tsx` | Grok: tools flags schema. Cursor: layout polish. |
| `src/lib/threads.functions.ts` | Grok adds fns; Cursor only consumes via `useServerFn`. |
| `package.json` | Add deps in own PR; never remove the other’s dep. |

### 2.4 Conflict rule

If both need same file same day: **Grok ships P0 backend first**, Cursor rebases.  
Never both force-push. Never rewrite published history (Lovable).

---

## 3. Sprint map (Grok) — detailed

### Sprint G0 — Stabilize hybrid (do first, ≤ 1 session)

**Goal:** Chat history + artifacts never lie after edit/retry/tools.

#### G0.1 Truncate messages on edit/retry

**Files**
- `src/lib/threads.functions.ts` — new `truncateThreadMessagesAfter`
- `src/routes/_authenticated/chat.$threadId.tsx` — call before `setMessages` + regenerate
- optional: soft-delete vs hard `DELETE … WHERE created_at >= …`

**SQL (if needed)**
```sql
-- Prefer hard delete scoped by RLS (owner via thread)
-- Or: messages.superseded_at timestamptz NULL
```

**API sketch**
```ts
truncateThreadMessagesAfter({
  threadId: uuid,
  afterMessageId: uuid, // exclusive: keep this message if user edit? 
  // Edit user: delete this message + all after
  // Retry assistant: delete this assistant + all after
  mode: "edit_user" | "retry_assistant",
})
```

**Acceptance**
- [x] Pure helpers + unit tests (`selectMessageIdsToDelete`, keepCount)
- [x] Server fn `truncateThreadMessagesAfter` (uuid + keepCount fallback)
- [x] Edit/retry wire in `chat.$threadId.tsx`
- [ ] Manual: edit user → reload → history truncated (human smoke)
- [ ] Manual: retry assistant → no zombie rows (human smoke)
- [x] RLS: uses auth middleware + thread-scoped delete

#### G0.2 Fence vs tools de-dupe

**Files:** `src/routes/api/chat.ts`

**Logic**
```ts
// onFinish or after stream:
const toolCreated = /* inspect steps / toolResults for create_artifact ok */;
if (mode === "build" && !toolCreated && toolFlags.create_artifact !== false) {
  extractArtifacts(text) → insert
}
```

**Acceptance**
- [x] Unit: `shouldFenceArtifacts` / `toolCreatedArtifact`
- [x] `onFinish` uses all steps' toolResults; skip fence if create ok
- [ ] Manual: tool create without fence double (human smoke)
- [ ] Manual: fence-only still creates artifact (human smoke)

#### G0.3 Persist tool-only assistant

**Files:** `src/routes/api/chat.ts` `persistAssistant`

**Logic**
- If `text` empty and tools ran: insert parts with tool summary text  
  e.g. `Created artifact «Title» (id…)` / `Edited path in artifact …`
- Prefer real UIMessage parts if AI SDK exposes them in `onFinish` steps

**Acceptance**
- [x] Code: empty text + tool summary → insert assistant row
- [ ] Manual: tool-only Codestral turn shows summary in list

#### G0.4 Commit hygiene (coordinate with human)

- [ ] Single coherent commit of M1–M6 + G0 fixes on `developeredit`
- [ ] Exclude `.claude/`, secrets, local noise
- [ ] PR to `main` only on explicit human order

---

### Sprint G1 — Agent intelligence depth

**Goal:** Tools feel like a real agent, not ChatGPT + buttons.

#### G1.1 Tool quality pass

| Tool | Improvements |
|------|----------------|
| `create_artifact` | Cap content size; sanitize paths (`..`); return `filesCount`; optional update-if-title-match |
| `edit_file` | Return before/after snippet (max 2k) for Cursor canvas Diff tab later; multi-replace option `replace_all` |
| `read_artifact` | List mode: return file tree without full content when `paths_only: true` |
| `remember` | Return previous value if overwrite; toast hook via stream data part `data-remembered` |
| `plan_steps` | Persist last plan into `thread_memory` key `last_plan` optional flag |

**Files:** `src/lib/agent/tools.ts`, tests in `artifacts.test.ts` or new `tools.test.ts`

#### G1.2 `web_search` + `fetch_url` (Mistral-only stack)

**Do NOT** use Lovable gateway `websearch--*`.

**Options (pick one, document in architecture.md)**
1. Mistral-native tool if available on account  
2. Self-hosted / Brave / Tavily via env `SEARCH_API_KEY`  
3. Stub tool that returns “web_search disabled” until key present

**Files**
- `src/lib/agent/tools.ts` — add tools behind flags
- `src/lib/agent/web.ts` — new fetch+html-to-text (max 8k)
- env: `SEARCH_API_KEY` optional; never commit

**Agent settings flags**
```json
{ "web_search": false, "fetch_url": false }
```

**Acceptance**
- [ ] Plan mode can ground with search when flag on
- [ ] fetch_url strips scripts, caps size
- [ ] Timeout 8s, no SSRF to localhost/metadata IPs (blocklist)

#### G1.3 Streaming data parts for client

Emit UI-friendly stream annotations (AI SDK data parts):
- `data-artifact-created` `{ artifactId, title }`
- `data-memory-saved` `{ key }`
- `data-plan` `{ goal, steps }`

**Files:** `chat.ts` + document contract for Cursor MessageList/Canvas  
**Do not** implement full Canvas UI — only contract.

#### G1.4 Model routing refinement

| Mode / task | Model |
|-------------|--------|
| Build (default Large/Medium thread) | `codestral-latest` |
| Plan | keep user model; if Codestral → bump to `mistral-large-latest` |
| Explicit Small / Pixtral / Nemo | never auto-override |
| Suggestions (later, if Grok implements API) | `mistral-small-latest` |

**Files:** `src/lib/models.ts` + tests already partial — extend matrix

#### G1.5 Reasoning parts (only if Mistral streams them)

- If provider never sends reasoning: **skip UI**, document “N/A for Mistral”
- Do not implement OpenAI-specific reasoning pipeline
- Cursor may add collapsible UI later when parts exist

---

### Sprint G2 — Persistence, versions, Realtime (data layer)

> UI for timeline/versions = Cursor. **Schema + write path = Grok.**

#### G2.1 `artifact_versions` table

```sql
CREATE TABLE public.artifact_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id uuid NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  files jsonb NOT NULL,
  content text,
  message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'tool', -- tool | fence | user_save
  created_at timestamptz NOT NULL DEFAULT now()
);
-- RLS: read/insert if owns artifact via threads.user_id
CREATE INDEX artifact_versions_artifact_created_idx
  ON public.artifact_versions(artifact_id, created_at DESC);
```

**Wire in**
- `create_artifact` / `edit_file` / fence insert / `updateArtifactFiles` → snapshot version

**Server fns for Cursor**
- `listArtifactVersions({ artifactId })`
- `restoreArtifactVersion({ versionId })`

#### G2.2 Realtime channel helper (server-agnostic)

- Document channel name: `thread:{threadId}:artifacts`
- Prefer: tools already write DB; Cursor/client subscribes  
- Optional: Grok adds `broadcast` after insert if project uses supabase channels

#### G2.3 Index memory

```sql
CREATE INDEX IF NOT EXISTS thread_memory_thread_updated_idx
  ON public.thread_memory(thread_id, updated_at DESC);
```

---

### Sprint G3 — Quality, monitoring, BPI

#### G3.1 Live regen suite (Grok drives process + scoring)

Fixed prompts (export to `docs/samples/2026-07/`):

| # | Prompt id | Prompt (short) | Expect |
|---|-----------|----------------|--------|
| 1 | `dash-ops` | dark ops dashboard Chart.js Week/Month/Year | HTML + interactivity |
| 2 | `landing-northline` | SaaS landing Northline, not purple | visual craft |
| 3 | `todo-local` | todo app localStorage | a11y + persistence |
| 4 | `edit-cycle` | follow-up on #1: “collapse sidebar” via `edit_file` | speed |

**Per sample write**
```
docs/samples/2026-07/{id}.html
docs/samples/2026-07/{id}.meta.md  # time_s, model, mode, tool_calls, score
```

**Update** `docs/progress.md` BPI table with real numbers (not estimates).

#### G3.2 Vitest expansion (target ≥ 25 tests)

| Module | Cases |
|--------|--------|
| `extractArtifacts` | nested fences, empty, huge, title= |
| `composeSystem` | plan no fence instruction, memory empty |
| `resolveModelForMode` | all catalog ids × modes |
| `classifyChatError` | 429/402/5xx/offline |
| `parseMeta` | path quotes |
| `edit_file` pure helpers | extract pure applyPatch to test without supabase |

#### G3.3 Health & status

- [ ] `/api/ai-status` includes `gitSha` or `buildMarker` bump on each ship
- [ ] Optional `/api/public/health` = DB ping + mistral key bool (no secrets)
- [ ] Confirm `reportLovableError` on tool failures (log only, no PII)

#### G3.4 Prompt / craft iteration

- Tune `DEFAULT_SYSTEM_PROMPT` + `SYSTEM_BUILD` after sample scores  
- Never weaken Mistral-only rule  
- Log prompt version string in system: `prompt_rev: 2026-07-20-a`

---

### Sprint G4 — Advanced agent (later)

| Item | Notes | Priority |
|------|-------|----------|
| `run_js` tool | Client worker + tool result callback — design with Cursor | Low |
| Multi-file edit batch | `edit_files[]` tool | Medium |
| Cost / token log table | `usage_daily` | Medium |
| Public generate API | `/api/public/v1/generate` + api_keys | Post-1.0 |
| Branch threads SQL | `parent_thread_id` — Grok schema, Cursor UI | Medium |

---

## 4. File-level checklist (Grok)

### Create

- [ ] `src/lib/agent/web.ts` — fetch_url helpers + SSRF guard  
- [ ] `src/lib/agent/tools.test.ts`  
- [ ] `src/lib/agent/patch.ts` — pure search_replace for unit tests  
- [ ] `supabase/migrations/YYYYMMDD_artifact_versions.sql`  
- [ ] `supabase/migrations/YYYYMMDD_thread_memory_idx.sql`  
- [ ] `docs/samples/2026-07/*.html` + `*.meta.md`  
- [ ] `docs/agent-tools.md` — tool reference (Grok writes)

### Modify

- [ ] `src/routes/api/chat.ts` — G0–G1  
- [ ] `src/lib/agent/tools.ts` — quality + new tools  
- [ ] `src/lib/agent/prompts.ts` — prompt_rev  
- [ ] `src/lib/models.ts` — routing matrix  
- [ ] `src/lib/threads.functions.ts` — truncate + versions list/restore  
- [ ] `docs/progress.md` — real BPI  
- [ ] `docs/architecture.md` — tools/data flow update  

### Do not create (Cursor)

- Monaco components, `/templates` routes, Tour, Playwright specs

---

## 5. Acceptance — “Grok half done”

Grok track is **done for parallel milestone G★** when:

- [ ] G-P0-1, G-P1-1, G-P1-2 closed  
- [ ] Live 4-prompt suite scored in `progress.md`  
- [ ] ≥ 20 unit tests green  
- [ ] `create_artifact` / `edit_file` write `artifact_versions`  
- [ ] `web_search`/`fetch_url` either shipped behind flag or explicitly deferred in this file  
- [ ] `/api/ai-status` green on prod after deploy  
- [ ] No OpenAI/Gateway regression  
- [ ] Cursor can call list/restore versions without touching tool execute code  

---

## 6. Daily standup template (paste into chat)

```
Grok standup:
- Done:
- Doing:
- Blocked (Cursor?):
- Files touched:
- Tests: pass/fail
- BPI / samples:
```

---

## 7. Handoff messages to Cursor

When Grok finishes a contract, append here:

| Date | Contract | Payload | Cursor action |
|------|----------|---------|---------------|
| 2026-07-20 | `truncateThreadMessagesAfter` | `{ threadId, messageId?, mode, keepCount? }` | ✅ wired by Grok in chat page; Cursor may re-use for palette |
| _pending_ | `data-artifact-created` | `{artifactId,title}` | early canvas focus |
| _pending_ | `listArtifactVersions` | server fn | timeline UI |

---

## 8. Explicit out of scope (Grok)

- Monaco editor, DiffEditor chrome, version **slider UI**  
- Template gallery pages & seed **UI**  
- Onboarding tour  
- Landing marketing rewrite  
- Playwright browser flows  
- Billing, collab Yjs, voice Whisper  
- Any non-Mistral chat provider  

---

## 9. OmniOps hard rules (reminder)

| Rule | |
|------|--|
| Workspace | `/Users/erikbabcan/lovable-builder-cosyapp` only |
| Branch | `developeredit` |
| `main` | locked — PR only, human merge order |
| AI | Mistral only |
| Secrets | never commit; Lovable Secrets + local `.env` |
| After prod | smoke `/api/ai-status` + `/chat` |
