# AI Builder

A dark, minimalist AI Builder workspace: threaded chat on the left, live artifact
canvas on the right. Ask for a landing page, markdown, or UI mock — watch it
render in a sandboxed preview.

Built on **TanStack Start** + **Supabase** (Lovable Cloud for auth/DB only) +
**Mistral API** (direct) via the Vercel **AI SDK v6**.

> **AI policy:** Chat uses **only** `api.mistral.ai` with `MISTRAL_API_KEY`.  
> No Lovable AI Gateway, no OpenAI, no ChatGPT, no Gemini.

## Features

- **Threaded chat** with full server-side persistence (messages, artifacts, settings)
- **Live artifact canvas** — HTML in a sandboxed iframe, markdown as prose
- **Agent settings** — Mistral model chips, temperature, system prompt
- **Per-thread model override** from the header
- **Google + email/password auth** via Lovable auth broker (hosting only)
- **Streaming** with AI SDK `useChat` + `DefaultChatTransport`
- **Artifact auto-extraction** from fenced ```html / ```markdown blocks
- **MCP tools** for threads/artifacts

## Stack

| Layer         | Choice                                    |
| ------------- | ----------------------------------------- |
| Framework     | TanStack Start (React 19, Vite)           |
| Styling       | Tailwind v4 + oklch tokens                |
| UI            | shadcn/ui + app-shell                     |
| **AI**        | **Mistral API** (`@ai-sdk/mistral`)       |
| Backend       | Supabase (Auth, DB, RLS)                  |
| Streaming     | `streamText` → `toUIMessageStreamResponse`|

## Default model

`mistral-large-latest` — change per-thread in the header or in **Agent settings**.

Other options: `mistral-small-latest`, `mistral-medium-latest`, `codestral-latest`,
`open-mistral-nemo`, `pixtral-large-latest`.

## Routes

- `/` → redirects to `/chat`
- `/auth` → sign in / sign up
- `/chat` → latest or new thread
- `/chat/:threadId` → builder workspace
- `POST /api/chat` → Mistral streaming (auth-gated, RLS-scoped)
- `/mcp` → remote MCP (OAuth)

## Local development

```bash
bun install
cp .env.example .env
# set SUPABASE_* + VITE_SUPABASE_* + MISTRAL_API_KEY
bun dev                # http://localhost:8080
bun run typecheck
```

**Required for chat:** `MISTRAL_API_KEY` from [console.mistral.ai](https://console.mistral.ai/api-keys).  
On Lovable Cloud deploy: add `MISTRAL_API_KEY` as a **secret** (do **not** enable Lovable AI connector for chat).

## Standing product rules

- Mobile-first; right-side hamburger
- Desktop modals blur background (except header)
- Chip-style filters (click selected chip to clear)
- Default model `mistral-large-latest` via **Mistral API only**
- Agent settings: model + temperature + system prompt

## License

Private.
