# Mega Upgrade — AI Builder (Layers 3 & 4 + polish)

Ideme dokončiť builder do stavu, ktorý sa nehanbí za produkciu. Layer 1 (vizuál) a Layer 2 (AI Elements chat) sú hotové. Toto je zvyšok.

## Ciele

1. **Canvas Power** — multi-file artefakty, tabs, live edit, console, export/share.
2. **Agent Intelligence** — reálny tool-calling, plan/build módy s rozdielnym správaním, streaming reasoning, memory per thread.
3. **Chat UX doladenie** — message actions (copy/retry/branch/edit), attachments, suggestions z contextu.
4. **Production polish** — error/empty states, rate-limit UX, keyboard shortcuts, a11y, SEO metadata na leaf routes.

---

## Layer 3 — Canvas Power

### Multi-file artefakty
- Parser v `src/routes/api/chat.ts`: rozšíriť z jedného ```lang bloku na fenced bloky s `path=` meta (napr. ```tsx path=src/App.tsx). Každý blok = jeden file v artefakte.
- DB: `artifacts.files jsonb` (`Array<{path, language, content}>`), + `entry_path text`. Migrácia + GRANT + RLS už z existujúceho vzoru.
- Backward compat: single-block správy sa uložia ako 1-file artefakt s `path=index.html`.

### Canvas UI (`src/components/app-shell/Canvas.tsx` + nové submoduly)
- **Tabs po files** (VS Code style, close nie, len switch).
- **Editor** — `@monaco-editor/react` (lazy, `<ClientOnly>` — inak SSR crash podľa execution-model pravidiel). Edit zmení lokálny state; „Save to thread" tlačidlo persistne späť do artefaktu.
- **Preview vs Code toggle** — segmented control v canvas hlavičke.
- **Console panel** (spodný drawer) — zachytáva `console.*` z iframe cez `postMessage` bridge injektnutý do preview HTML.
- **Device presets** — už existujú, pridať rotate + custom width input.
- **Export** — download ZIP (jszip, lazy) + „Copy share link" (jednoduchý public read-only route `/a/$artifactId` s anon SELECT policy len na `is_public=true` artefakty).

### Preview sandbox hardening
- `iframe sandbox="allow-scripts"` (bez `allow-same-origin`) — už tak je, potvrdiť.
- CSP meta v injektovanom HTML: `default-src 'self' 'unsafe-inline' data: blob:` — obmedziť sieť.

---

## Layer 4 — Agent Intelligence

### Tool calling (AI SDK v6 `tools`)
Registrovať v `src/routes/api/chat.ts` pomocou `tool({ description, inputSchema: z.object(...), execute })`:

| Tool | Účel | Execute |
|---|---|---|
| `create_artifact` | LLM explicitne vytvorí/updatne súbor v canvas | zapíše do `artifacts` + broadcast |
| `web_search` | grounding | volá existujúci `websearch` gateway (fallback: DuckDuckGo HTML) |
| `read_project_file` | čítanie predchádzajúcich artefaktov v threade | Supabase select |
| `plan_steps` | v Plan móde vráti štruktúrovaný plán (nezapisuje kód) | čisto vracia JSON |

Rendering cez už integrovaný `Tool` / `ToolHeader` (Layer 2). Streamované `toolCalls` sa zobrazia collapsed, po dokončení expandnú výsledok.

### Plan vs Build mode
- **Plan**: system prompt núti model použiť `plan_steps`, `create_artifact` je zakázaný. Výstup = kroky + otázky.
- **Build**: plný tool set, model má „create artifacts aggressively" inštrukciu.
- Toggle už existuje v Composer — treba prepojiť na `mode` field v request body a v API vetviť tools + system prompt.

### Reasoning stream
- `openai/gpt-5.5` cez Gateway podporuje `reasoning` parts v AI SDK v6. Renderovať cez `<Reasoning>` element z ai-elements (collapsed shimmer počas streamu).

### Per-thread memory
- Nová tabuľka `thread_memory (thread_id, key, value, updated_at)` + RLS podľa owner threadu.
- Tool `remember(key, value)` a auto-inject top N do system promptu pri každom requeste.

---

## Layer 3.5 — Chat UX doladenie

- `MessageActions` (copy, retry, edit, branch) pod každou assistant správou. Retry = zmaže od tejto správy dole a re-streamuje. Branch = duplikuje thread po túto správu.
- **Attachments**: image upload → Supabase Storage bucket `chat-attachments` (private, signed URLs), pass ako `image` part do modelu.
- **Suggestions**: po prvej odpovedi vygenerovať 3 follow-up chipy (druhý paralelný LLM call, cheap model).
- **Keyboard**: `Cmd+K` command palette (threads + akcie), `Cmd+Enter` send, `Cmd+/` toggle Plan/Build.

---

## Production polish

- **SEO**: pridať `head()` na `/`, `/auth`, `/a/$artifactId` (share) s unique title/description/og. Root už nemá og:image (správne).
- **Error boundaries**: každá route s loaderom → `errorComponent` + `notFoundComponent` (pravidlo z tanstack-errors-notfound). Aktuálne chýbajú na chat routes — doplniť.
- **Rate limit UX**: keď Gateway vráti 429, MessageList ukáže inline retry s countdown (`Retry-After` header).
- **a11y**: focus rings na všetkých interactive, `aria-label` na icon buttons, `role="log"` na Conversation, prefers-reduced-motion respect.
- **Empty states**: prázdny thread list, prázdny canvas, prázdny search — všetky s CTA.

---

## Data Model (nové migrácie)

```sql
ALTER TABLE public.artifacts
  ADD COLUMN files jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN entry_path text,
  ADD COLUMN is_public boolean NOT NULL DEFAULT false;

CREATE TABLE public.thread_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(thread_id, key)
);
-- + GRANT authenticated + service_role, RLS podľa vlastníctva threadu
```

Share route dostane `GRANT SELECT ON public.artifacts TO anon` gated policy `is_public = true`.

---

## Handoff / poradie implementácie

1. **Layer 3 base** — DB migrácia (files/entry_path/is_public) + parser + Canvas tabs + Preview/Code toggle.
2. **Monaco editor** (lazy, ClientOnly) + save-back.
3. **Console bridge** + Export ZIP + Share route + public artefakt page.
4. **Layer 4 tools** — `create_artifact`, `plan_steps`, Plan/Build vetvenie, reasoning render.
5. **Memory table + `remember` tool + `web_search` + `read_project_file`**.
6. **Chat UX** — MessageActions (copy/retry/edit/branch), attachments, follow-up suggestions.
7. **Polish** — SEO heads, error/notFound components, rate-limit UX, Cmd+K palette, a11y pass.

Každý krok = samostatný commit, typecheck zelený, potom ďalej.

## Otázky pred štartom

1. **Monaco vs CodeMirror 6** pre editor? Monaco = ťažší (~2MB), lepší DX pre TS. CM6 = lightweight, modulárny. Default: Monaco (lazy loadnutý, nevadí).
2. **Share links verejné bez auth**? Alebo len signed link s expiráciou? Default: verejné + toggle `is_public` v UI.
3. **Attachments**: len obrázky, alebo aj PDF/text files? Default: obrázky teraz, súbory neskôr.

Ak nechceš odpovedať, idem s defaultmi.
