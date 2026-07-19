# Workspace: lovable-builder-cosyapp

| | |
|---|---|
| Path | `/Users/erikbabcan/lovable-builder-cosyapp` |
| Remote | `https://github.com/youh4ck3dme/cosy-app-kit.git` |
| Branch | `main` |
| Publish | https://cosy-app-kit.lovable.app |
| Supabase | `hyffmlempcfmgtnqllrz` (auth/DB only) |
| **AI** | **Mistral API only** (`MISTRAL_API_KEY` → `api.mistral.ai`) |

## AI policy

- ✅ `MISTRAL_API_KEY` + `@ai-sdk/mistral`
- ❌ Lovable AI Gateway / `LOVABLE_API_KEY`
- ❌ OpenAI / ChatGPT / Gemini model ids

## Open

```bash
cursor /Users/erikbabcan/lovable-builder-cosyapp
```

## Run

```bash
cd /Users/erikbabcan/lovable-builder-cosyapp
bun install
# .env: SUPABASE_* + VITE_SUPABASE_* + MISTRAL_API_KEY
bun dev       # http://localhost:8080
```

## Env

| Var | Required | Notes |
|-----|----------|--------|
| `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` | yes | server |
| `VITE_SUPABASE_*` | yes | client |
| `MISTRAL_API_KEY` | **yes for chat** | [console.mistral.ai](https://console.mistral.ai/api-keys) |
| `LOVABLE_API_KEY` | **no** | do not use |

## Key files

| Area | Path |
|------|------|
| Chat API | `src/routes/api/chat.ts` |
| Mistral provider | `src/lib/ai-gateway.server.ts` |
| Model catalog (client-safe) | `src/lib/models.ts` |
| MCP tools | `src/lib/mcp/tools/*` |

## Debug chat

| Symptom | Cause | Fix |
|---------|--------|-----|
| 500 Missing `MISTRAL_API_KEY` | no key | set in `.env` / Cloud Secrets |
| Mistral auth failed | bad key | regenerate at console.mistral.ai |
| 429 | rate limit | wait / upgrade Mistral plan |
| Model not available | bad id | pick from Agent settings (Mistral list) |

Default model: `mistral-large-latest`.
