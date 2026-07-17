
# Mega upgrade buildera — po vrstvách

Postupujeme v 4 vrstvách. Každú vrstvu implementujem, ukážeš mi feedback, potom pokračujeme ďalej. Vizuál ostáva Vercel-like dark, len doladený.

---

## Layer 1 — Vizuál & UX polish  ⬅️ **teraz**

Cieľom je, aby builder pôsobil ako hotový premium produkt (Vercel/Linear/Resend feel), bez zmeny funkcionality.

**Design tokens (`src/styles.css`)**
- Doladiť oklch paletu: hlbšie `--background`, mierne teplejší `--foreground`, jasnejší `--primary` (elektrická modrá s glow variantom).
- Pridať tokeny: `--surface-1/2/3` (elevation), `--border-subtle`, `--border-strong`, `--shadow-glow`, `--gradient-radial`, `--gradient-mesh`.
- Grid pattern jemnejší + radial mask okolo canvasu (fade to background na okrajoch).

**Header**
- Sticky, `backdrop-blur-xl` + `bg-background/60`, tenká spodná hairline border.
- Logo mark vľavo (nie generický Sparkles) + názov threadu inline-editable.
- Model selector ako subtílny chip s glow pri hoveri.
- Publish button = primary gradient s soft shadow.

**Composer**
- Väčší radius, glass surface, jemný focus ring v primary farbe.
- Build/Plan ako segmented control (pill), nie 2 buttony.
- Suggestion chips pod inputom s fade-in stagger animáciou.
- Voice mic tlačidlo integrované vpravo, submit ako icon-only s gradientom.

**Message list**
- Assistant správy bez bubble (podľa chat-ui-composition), user správy = filled bubble `primary`/`primary-foreground`.
- Streaming: shimmer "Thinking…" namiesto dots.
- Markdown: lepšia typografia (headings, lists, inline code chip, code block s tmavým surface-2, copy button).
- "Sent to canvas" indikátor ako mini pill s icon + názvom artefaktu.

**Canvas**
- Mac-style window chrome (traffic lights, title bar) — jemný, nie kýčovitý.
- Device toggle (Desktop/Tablet/Mobile) ako chip segmented control v pravom hornom rohu.
- Zoom + refresh + open-in-new icon buttons.
- Empty state s ilustráciou + hint textom "Popíš čo chceš postaviť…".
- Loading state: skeleton grid s shimmer.

**Thread list**
- Hover reveal delete, active thread s ľavou akcent linkou.
- Grupovanie: Today / Yesterday / Previous 7 days / Older.
- Search input hore.

**Modals & Mobile**
- `AppDialog` už blur pod headerom — dopilovať transition (scale-in + fade).
- Mobile menu full-screen s stagger animáciou položiek, close button vľavo hore (hamburger vpravo pri otvorení sa mení na X).

**Mikrointerakcie**
- `hover-scale` na tool tlačidlách, `animate-fade-in` na nových messages, transition na theme tokens.
- Focus-visible ring všade (a11y).

---

## Layer 2 — Chat UX (AI Elements retrofit)  ⏭️ ďalej

- Nainštalovať AI Elements (`conversation`, `message`, `prompt-input`, `shimmer`, `tool`) a retrofit `MessageList` / `Composer` na ne.
- Message actions: copy, retry, branch.
- Attachments (drop image → passed as multimodal input).
- Voice input (Web Speech API alebo Lovable STT).
- Autoscroll s "jump to bottom" pill keď scrolluješ hore.

## Layer 3 — Canvas / Preview power

- Multi-file artefakty (tabs: `index.html`, `styles.css`, `script.js`).
- Živý edit kódu (Monaco) + hot-reload iframe.
- Console panel (zachytáva iframe `console.*`).
- Share link (public read-only route pre artefakt).
- Export ako ZIP.

## Layer 4 — Agent inteligencia

- Streaming reasoning (rozbaliteľný "Thinking…" blok).
- Tool calling: `web_search`, `generate_image`, `run_code` (sandboxed).
- Multi-step Plan mode: agent najprv vypíše plán, user schváli → executes.
- Per-thread memory summary (uložené v `threads.summary`).
- Agent settings reálne aplikované (temperature, systemPrompt, enabled tools sa posielajú do `/api/chat`).

---

## Technical notes (Layer 1)

- Žiadne biznis-logic zmeny, len frontend: `src/styles.css`, `src/components/app-shell/*`, `src/routes/_authenticated/chat.$threadId.tsx`.
- Všetky farby cez semantic tokens (`bg-surface-1`, `text-foreground`, …), žiadne `bg-black`/`text-white`.
- Backdrop blur cez Tailwind utilities (nie ručne `-webkit-`).
- Fonts: pridať `Geist` + `Geist Mono` cez `<link>` v `__root.tsx` head, namapovať v `@theme`.
- Logo mark: vygenerujem malý SVG/PNG (nie Sparkles) do `src/assets/`.
- Typecheck musí ostať clean, žiadny functionality regression.

Po dokončení Layer 1 pošlem preview a spýtam sa, či ísť na Layer 2 (Chat UX / AI Elements) alebo preskočiť.
