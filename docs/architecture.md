# Builder architecture (M6 docs freeze)

```mermaid
flowchart LR
  User --> Composer
  Composer --> ApiChat["/api/chat"]
  ApiChat --> Mistral
  Mistral -->|tools| Tools["create_artifact edit_file read_artifact remember plan_steps"]
  Mistral -->|fallback| Fence["extractArtifacts"]
  Tools --> DB[(Supabase artifacts + thread_memory)]
  Fence --> DB
  DB --> Canvas
  MessageList --> ToolUI[ai-elements Tool]
```

## AI

- Provider: **Mistral only** (`@ai-sdk/mistral`), key `MISTRAL_API_KEY`.
- Build mode prefers **Codestral** when thread model is Large/Medium default.
- Plan mode uses structured plan tools; no `create_artifact` / `edit_file`.
- Fence HTML parsing remains as fallback when the model emits ```html blocks.

## Key paths

| Path | Role |
|------|------|
| `src/routes/api/chat.ts` | Stream + tools + persist |
| `src/lib/agent/*` | tools, prompts, memory, artifacts, errors |
| `src/components/app-shell/*` | Chat shell + canvas |
| `src/lib/models.ts` | Catalog + routing |
| `docs/progress.md` | BPI scoreboard |
| `docs/todo.md` | Hub — parallel agent boards |
| `docs/groktodo.md` | Grok world (backend / agent) |
| `docs/cursortodo.md` | Cursor world (UI / canvas / growth) |

## Auth / data

Supabase Auth + RLS on threads/messages/artifacts/thread_memory.
