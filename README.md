# AI Builder

A Vercel/Resend-inspired AI Builder: a dark, minimalist workspace where a threaded
AI chat lives on the left and a live artifact canvas renders whatever the agent
generates on the right. Ask for a landing page, a markdown doc, or a UI mock, and
watch it appear in a sandboxed preview with responsive device modes.

Built on **TanStack Start** + **Lovable Cloud** (Supabase) + **Lovable AI Gateway**
via the Vercel **AI SDK v6** — no external API keys, no external accounts.

## Features

- **Threaded chat** with full server-side persistence (messages, artifacts, settings)
- **Live artifact canvas** — HTML rendered in a sandboxed iframe, markdown rendered
  as prose, with device presets (desktop / tablet / mobile) and zoom
- **Agent settings modal** — model selector (chip-style), temperature slider,
  editable system prompt, tool toggles
- **Per-thread model override** from the header
- **Mobile-first**: right-side hamburger, full-screen menu, chat / preview toggle
- **Desktop modals** with blurred backdrop (except header row)
- **Chip-style filters** that revert to default when the selected chip is clicked
- **Google + email/password auth** via the Lovable auth broker
- **Streaming responses** with AI SDK's `useChat` + `DefaultChatTransport`
- **Artifact auto-extraction** from fenced ```html / ```markdown blocks
- **Auto-titled threads** from the first user message

## Stack

| Layer         | Choice                                       |
| ------------- | -------------------------------------------- |
| Framework     | TanStack Start (React 19, Vite 7)            |
| Styling       | Tailwind v4 + oklch design tokens            |
| UI primitives | shadcn/ui + custom app-shell components      |
| AI            | Vercel AI SDK v6 → Lovable AI Gateway        |
| Backend       | Lovable Cloud (Supabase — Auth, DB, RLS)     |
| Streaming     | `streamText` → `toUIMessageStreamResponse`   |

## Default model

`openai/gpt-5.5` — served through the Lovable AI Gateway. Change per-thread from
the header or set a workspace default in **Agent settings**.

## Routes

- `/` → redirects to `/chat`
- `/auth` → sign in / sign up (Google + email)
- `/chat` → opens or creates your latest thread
- `/chat/:threadId` → the builder workspace
- `POST /api/chat` → AI SDK streaming endpoint (auth-gated, RLS-scoped)

## Data model

- `threads(id, user_id, title, model, temperature, system_prompt, …)`
- `messages(id, thread_id, role, parts jsonb, …)`
- `artifacts(id, thread_id, message_id, kind, title, content, …)`
- `agent_settings(user_id pk, default_model, default_temperature, default_system_prompt, tools jsonb)`

All tables have RLS scoped to `auth.uid()`. `service_role` has full access; the
chat route acts as the signed-in user via a bearer token — never the admin key.

## Local development

```bash
bun install
bun dev
```

The dev server runs at `http://localhost:8080`. No env vars need to be set
manually — Lovable Cloud + AI Gateway credentials are injected automatically.

## Standing product rules

These rules are baked into the memory file (`mem://index.md`) and apply to every
future change:

- Mobile-first by default
- Right-side hamburger → full-screen menu
- Desktop modals blur the background (except the header row)
- Chip-style filters preferred over dropdowns; clicking a selected chip clears it
- Default model `openai/gpt-5.5` via the Lovable AI Gateway
- Every app has an Agent settings submenu with model + temperature + system prompt

## License

MIT
