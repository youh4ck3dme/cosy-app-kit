# Agent tools reference (Grok)

**Provider:** Mistral only · **Route:** `POST /api/chat` · **Factory:** `buildTools({ mode, threadId, supabase, flags })`

Fence HTML fallback still runs when Build mode finishes **without** a successful `create_artifact` tool call.

## Modes

| Mode | Tools |
|------|--------|
| **Build** | `create_artifact`, `edit_file`, `read_artifact`, `remember`, optional `fetch_url` / `web_search` |
| **Plan** | `plan_steps`, `read_artifact`, `remember`, optional `fetch_url` / `web_search` — **no** create/edit |

Flags default: create/edit/read/remember/plan **on**; `web_search` / `fetch_url` **off** until user enables in Agent Settings.

---

## Tools

### `create_artifact` (Build)

| Input | |
|-------|--|
| `title` | string ≤120 |
| `kind` | `html` \| `markdown` \| `code` |
| `entry_path?` | relative path |
| `files[]` | `{ path, language, content }` 1–40 |

**Guards:** path sanitize (no `..`, no absolute); max file size 500k.  
**Output:** `{ ok, artifactId, title, kind, filesCount }`  
**Stream part:** `data-artifact-created` `{ artifactId, title, kind? }`

### `edit_file` (Build)

| Input | |
|-------|--|
| `artifact_id` | uuid |
| `path` | relative |
| `mode` | `search_replace` (default) \| `rewrite` |
| `search` / `replace` / `replace_all` | for search_replace |
| `content` | for rewrite |

**Output:** `{ ok, artifactId, path, bytes, replacements?, beforeSnippet, afterSnippet }`  
Snippets ≤2k for Cursor Diff UI later.

### `read_artifact` (Plan + Build)

| Input | |
|-------|--|
| `artifact_id?` | uuid — else latest in thread |
| `paths_only?` | if true, return path/language/bytes only |

### `remember` (Plan + Build)

| Input | `key`, `value` |
| **Output** | `{ ok, key, remembered, previous }` |
| **Stream** | `data-memory-saved` |

### `plan_steps` (Plan only)

| Input | `goal`, `steps[]`, `risks[]`, `open_questions[]`, `persist?` |
| **persist** | stores JSON under memory key `last_plan` |
| **Stream** | `data-plan` |

### `fetch_url` (flag)

Public http(s) only; SSRF blocklist (localhost, private IPs, metadata). Timeout 8s, text cap 8k.

### `web_search` (flag)

Requires server secret `SEARCH_API_KEY` or `TAVILY_API_KEY` (Tavily). Without key → clear disabled error. **No** Lovable gateway.

---

## Stream data parts (Cursor)

Listen with `useChat({ onData })` or parts with `type: "data-*"`.

| Type | Payload | Suggested UI |
|------|---------|--------------|
| `data-artifact-created` | `{ artifactId, title, kind? }` | toast + invalidate thread + focus canvas |
| `data-memory-saved` | `{ key, previous? }` | toast |
| `data-plan` | `{ goal, steps, risks?, open_questions? }` | toast / plan card |

---

## Artifact versions (G2)

Every successful write creates a row in `artifact_versions`:

| Source | When |
|--------|------|
| `tool` | `create_artifact` / `edit_file` |
| `fence` | fence HTML insert path |
| `user_save` | Canvas Save (`updateArtifactFiles`) |
| `restore` | after `restoreArtifactVersion` |

### Server fns (Cursor phase H)

```ts
// GET
listArtifactVersions({ artifactId, limit? })
// → { id, artifact_id, source, title, entry_path, created_at, bytes }[]

// POST
restoreArtifactVersion({ versionId })
// → { ok, artifactId, versionId }
// Restores files/content onto live artifact + writes a new source=restore snapshot
```

**Migration:** `supabase/migrations/20260720120000_artifact_versions.sql`  
Apply on Lovable/Supabase before timeline UI will see data. See [`docs/migrations.md`](./migrations.md).

---

## suggestFollowups (optional chips API)

```ts
suggestFollowups({ lastAssistantText?: string })
// → { ok, source: "mistral" | "static", suggestions: string[] }
```

- Model: `mistral-small-latest` (`SUGGESTION_MODEL`)
- Falls back to static starters if no key / parse fail
- Pure parse helpers: `src/lib/agent/suggestions.ts`  
- Cursor: call after last assistant message; static chips OK without this

---

## Related files

| Path | Role |
|------|------|
| `src/lib/agent/tools.ts` | tool factory |
| `src/lib/agent/patch.ts` | search/replace pure |
| `src/lib/agent/web.ts` | fetch + search |
| `src/lib/agent/stream-parts.ts` | data-part mapping |
| `src/lib/agent/finish.ts` | fence gate + summaries |
| `src/lib/agent/versions.ts` | version snapshots |
| `src/lib/threads.functions.ts` | list/restore + user_save snapshot |
| `src/routes/api/chat.ts` | stream + persist |
