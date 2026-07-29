# Workspace: lovable-builder-cosyapp

|          |                                                             |
| -------- | ----------------------------------------------------------- |
| Path     | `/Users/erikbabcan/lovable-builder-cosyapp`                 |
| Remote   | `https://github.com/youh4ck3dme/cosy-app-kit.git`           |
| Work branch | **`developeredit`** (not `main`)                        |
| Supabase | `uotvcsjoriamsagfprbq` (see `public-config.ts`)             |
| **AI**   | **Mistral API only** (`MISTRAL_API_KEY` → `api.mistral.ai`) |

## Not the app

| Path | Role |
| ---- | ---- |
| `/Users/erikbabcan/Pictures/cosy-app-kit` | Optional copy/backup — **no git truth** |
| `/Users/erikbabcan/lovable-builder-k.d` | Notes only |

Do **not** `git init` + new GitHub repo from Pictures while `origin` already exists.

## AI policy

- ✅ `MISTRAL_API_KEY` + `@ai-sdk/mistral`
- ❌ Lovable AI Gateway / `LOVABLE_API_KEY`
- ❌ OpenAI / ChatGPT / Gemini model ids
- ❌ Product MCP (`@lovable.dev/mcp-js`) — removed

## Open

```bash
cursor /Users/erikbabcan/lovable-builder-cosyapp
```

## Run

```bash
cd /Users/erikbabcan/lovable-builder-cosyapp
bun install
# .env: SUPABASE_* + VITE_SUPABASE_* ; .env.local: MISTRAL_API_KEY
bun dev       # http://127.0.0.1:8080
bun run verify
```

## Env

| Var                                         | Required         | Notes                                                     |
| ------------------------------------------- | ---------------- | --------------------------------------------------------- |
| `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` | yes              | server                                                    |
| `VITE_SUPABASE_*`                           | yes              | client                                                    |
| `MISTRAL_API_KEY`                           | **yes for chat** | [console.mistral.ai](https://console.mistral.ai/api-keys) |
| `LOVABLE_API_KEY`                           | **no**           | do not use                                                |
| `SMOKE_BASE_URL`                            | prod-smoke only  | required for `bun run prod-smoke`                         |

## Key files

| Area                        | Path                           |
| --------------------------- | ------------------------------ |
| Chat API                    | `src/routes/api/chat.ts`       |
| Mistral provider            | `src/lib/ai-gateway.server.ts` |
| Model catalog (client-safe) | `src/lib/models.ts`            |
| Deploy markers              | `src/lib/deploy-rev.ts`        |
| Blueprint                   | `OMNIOPS_BLUEPRINT.md`         |

## Auth

| Mode               | How                                      |
| ------------------ | ---------------------------------------- |
| Email/password     | Supabase on local + prod                 |
| Google             | Configure via Supabase Auth providers    |

Lovable OAuth consent routes + `cloud-auth-js` are **removed**.

## Debug chat

| Symptom                       | Cause      | Fix                                     |
| ----------------------------- | ---------- | --------------------------------------- |
| 500 Missing `MISTRAL_API_KEY` | no key     | set in `.env.local` / host secrets      |
| Mistral auth failed           | bad key    | regenerate at console.mistral.ai        |
| 429                           | rate limit | wait / upgrade Mistral plan             |
| Model not available           | bad id     | pick from Agent settings (Mistral list) |

Default model: `mistral-large-latest`.
