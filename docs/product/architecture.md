# Builder architecture (M6 docs freeze)

```mermaid
flowchart LR
  User --> Composer
  Composer --> ApiChat["/api/chat"]
  ApiChat --> Intent["semantic-intent detect + skeleton seed"]
  Intent -->|data-intent-detected / data-artifact-created| StreamParts
  Intent --> DB[(Supabase artifacts + thread_memory)]
  ApiChat --> Mistral
  Mistral -->|tools| Tools["create_artifact edit_file read_artifact remember plan_steps fetch_url web_search"]
  Mistral -->|fallback| Fence["extractArtifacts"]
  Mistral -->|data-*| StreamParts["artifact-created memory-saved plan intent-detected"]
  Tools --> DB
  Fence --> DB
  StreamParts --> Toast[Client toasts / canvas invalidate]
  DB --> Canvas
  MessageList --> ToolUI[ai-elements Tool]
```

## AI

- Provider: **Mistral only** (`@ai-sdk/mistral`), key `MISTRAL_API_KEY`.
- Build mode prefers **Codestral** when thread model is Large/Medium default.
- Plan mode uses structured plan tools; no `create_artifact` / `edit_file`.
- **Instant Product Skeleton** (first Build turn, empty thread): rule-based intent → premium single-file HTML on canvas **before** Codestral streams. See [`SEMANTIC_INTENT_SKELETON.md`](./SEMANTIC_INTENT_SKELETON.md).
- Fence HTML parsing remains as fallback when the model emits ```html blocks **and** tools did not create an artifact (skeleton seed also suppresses fence).
- Optional grounding: `fetch_url` (SSRF-safe), `web_search` via `SEARCH_API_KEY` (Tavily) — both off by default in agent settings.
- Tool reference: [`docs/agent-tools.md`](./agent-tools.md).

## Key paths

| Path                              | Role                                      |
| --------------------------------- | ----------------------------------------- |
| `src/routes/api/chat.ts`          | Stream + tools + persist + skeleton seed  |
| `src/lib/agent/*`                 | tools, prompts, memory, artifacts, errors |
| `src/lib/agent/semantic-intent/*` | Intent detect + product skeletons         |
| `src/components/app-shell/*`      | Chat shell + canvas                       |
| `src/lib/models.ts`               | Catalog + routing                         |
| `docs/progress.md`                | BPI scoreboard                            |
| `docs/todo.md`                    | Hub — parallel agent boards               |
| `docs/groktodo.md`                | Grok world (backend / agent)              |
| `docs/cursortodo.md`              | Cursor world A→Z                          |
| `docs/agent-tools.md`             | Tools + versions API for UI               |
| `artifact_versions`               | Snapshots on tool/fence/save/restore      |

## Auth / data

Supabase Auth + RLS on threads/messages/artifacts/thread_memory.
