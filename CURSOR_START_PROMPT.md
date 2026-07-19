# Cursor agent — starter prompt (Mistral-only)

```markdown
# Úloha: cosy-app-kit — dev setup + Mistral-only AI

Repo: `/Users/erikbabcan/lovable-builder-cosyapp` (youh4ck3dme/cosy-app-kit).

## Hard rules
- AI **len** cez Mistral API (`MISTRAL_API_KEY` → api.mistral.ai).
- **Zákaz** Lovable AI Gateway, LOVABLE_API_KEY, OpenAI, ChatGPT, Gemini.
- Ne force-push / rebase `main` (Lovable git sync) — AGENTS.md.

## Urob
1. Over `.env` má MISTRAL_API_KEY + Supabase keys.
2. `bun install` && `bun dev`.
3. Over `src/routes/api/chat.ts` + `src/lib/ai-gateway.server.ts` + `src/lib/models.ts`.
4. Smoke: login → chat → assistant message sa uloží.
5. Report: čo beží, čo treba v Lovable Secrets (`MISTRAL_API_KEY` only).
```
