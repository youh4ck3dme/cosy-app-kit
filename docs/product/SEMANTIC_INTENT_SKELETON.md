# Semantic Intent → Instant Product Skeleton

**Status:** MVP shipped · **Branch:** `feat/semantic-intent-engine` · **AI:** Mistral-only (Build = Codestral)  
**Scorecard:** SCORECARD D1–D11 ([`SCORECARD_PROMPT_1.md`](./SCORECARD_PROMPT_1.md))

---

## 1) Product brief (1 page)

### Problem

The first “aha” in Builder is **not** another chat reply. Users wait 15–40s for Codestral while the canvas stays empty. Generic AI chats feel the same. We lose the differentiation window in the first 3 seconds.

### Solution

On the **first Build turn** of an empty thread:

1. **Detect** product intent from the user prompt (deterministic, &lt;5 ms — no extra LLM).
2. **Seed** a premium **single-file HTML skeleton** onto the live canvas **before** Codestral streams.
3. **Build fills logic** into existing slots/hooks via `edit_file` (preferred) instead of inventing layout from zero.

### Intents (MVP)

| Intent | Product shape |
|--------|----------------|
| `booking` | Service → date → slot → form → confirm + staff + cancel (BookSlot-class) |
| `landing` | Hero / features / pricing teaser / CTA |
| `dashboard` | Sidebar + KPIs + chart slot + activity empty state |
| `crud` | List + filters + empty state + create drawer shell |
| `waitlist` | Atmospheric capture + validation shell + social proof row |

### Success metrics

| Metric | Target |
|--------|--------|
| Time-to-first-canvas paint (skeleton) | **&lt; 3 s** after send (auth + DB insert; no model wait) |
| Intent hit rate on curated demos | ≥ 90 % correct top intent |
| SCORECARD lift | D1, D7, D8, D10 baseline from skeleton alone; Build raises D2–D6, D11 |
| Mistral-only | No OpenAI / Lovable Gateway; skeleton is local TS templates |

### Non-goals (MVP)

- LLM-based intent classification  
- Multi-file project packages / `launch_site` auto-seed  
- Design-canvas editor, marketplace, CRDT  
- Plan mode seeding  

---

## 2) Architecture — detector → skeleton → Build

```text
User prompt (Build mode, empty thread)
        │
        ▼
┌───────────────────┐
│ detectSemanticIntent │  pure TS, keyword/score (no network)
│ brand / title hints  │
└─────────┬─────────┘
          │ intent + confidence
          ▼
┌───────────────────┐
│ renderSkeletonHTML │  single-file premium shell
│ empty states +     │  data-nf-slot / BUILD_HOOK markers
│ mobile-first + a11y│  localStorage scaffold + toast host
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐     data-artifact-created
│ Supabase artifacts │──── data-intent-detected ──► Client toast + canvas invalidate
│ + version snapshot │     (before streamText)
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ composeSystem +    │  “Skeleton already on canvas — edit_file, do not recreate”
│ activeArtifactId   │
└─────────┬─────────┘
          │
          ▼
     Codestral (Build tools: edit_file / create_artifact fallback)
          │
          ▼
     Filled product on same artifact
```

| Layer | Path | Role |
|-------|------|------|
| Detect | `src/lib/agent/semantic-intent/detect.ts` | Intent + brand extraction |
| Skeletons | `src/lib/agent/semantic-intent/skeletons.ts` | Deterministic HTML templates |
| Seed | `src/lib/agent/semantic-intent/seed.ts` | Insert artifact + snapshot |
| Wire | `src/routes/api/chat.ts` | Pre-stream seed + system appendix |
| Stream contract | `src/lib/agent/stream-parts.ts` | `data-intent-detected` |
| Client | `chat.$threadId.tsx` `onData` | Toast + focus canvas artifact |

### SCORECARD mapping (skeleton guarantees)

| ID | Skeleton contribution |
|----|------------------------|
| D1 | Single-file HTML, no CDN |
| D2 | Flow shells / CTAs present (logic TBD by Build) |
| D3 | `data-nf-slot` / `BUILD_HOOK` markers for domain engine |
| D4 | localStorage try/catch scaffold |
| D5 | Staff/operator panel empty state (booking/dashboard/crud) |
| D6 | Secondary reverse path shell (cancel / undo region) |
| D7 | Empty states + toast host; no dead primary chrome |
| D8 | Mobile-first CSS (~390px), desktop ≥768 enhancement |
| D9 | Labels, aria, focus-visible, Escape-ready dialog shell |
| D10 | 1 prompt → skeleton + Build fill (high promptability) |
| D11 | Stable structure so iterative `edit_file` is safer |

---

## 3) MVP PR scope (≤ 1 day)

### In scope

- [x] Rule-based detector (5 intents + `unknown`)  
- [x] 5 premium single-file skeletons  
- [x] Seed on first Build turn when thread has **zero** artifacts  
- [x] Pre-stream `data-artifact-created` + `data-intent-detected`  
- [x] System appendix: prefer `edit_file` on seeded artifact  
- [x] Unit tests (detect + skeleton invariants)  
- [x] Product brief (this doc) + 3 demo prompts  

### Out of scope / follow-ups

- LLM re-rank / multi-label intents  
- Skeleton versioning UI  
- Auto-skip seed when user asks for markdown-only  
- E2E Playwright “3s canvas” gate  
- Plan-mode preview cards  

### Acceptance

1. `bun test src/lib/agent/semantic-intent` green  
2. Manual: empty thread + demo prompt → canvas shows skeleton **before** long Build text  
3. Codestral continues and mutates same artifact (or creates only if tools force)  
4. No OpenAI / gateway paths introduced  

---

## 4) Three wow demo prompts

Copy into a **new** chat, mode **Build**:

### Demo A — Booking (BookSlot-class)

```text
Build a booking app for a barbershop called Blade & Oak: customers pick a service, date, and time slot, enter name + email, get a confirmation ID; staff can confirm/complete/cancel; customers can cancel with ID+email. Persist in localStorage. Mobile-first, no CDN.
```

**Expect:** intent `booking` → booking skeleton (steps + staff + cancel shells) in &lt;3s, then Build fills slot engine.

### Demo B — Waitlist

```text
Create a premium waitlist landing for “Northline Signal” — atmospheric hero, one sentence value prop, email join with validation, social proof row, no purple gradients. Single HTML file.
```

**Expect:** intent `waitlist` → capture skeleton + empty social proof, then Build polishes copy/animation.

### Demo C — Ops dashboard

```text
Build a dark ops dashboard called Harbor Control with sidebar, KPI cards, revenue chart (Canvas 2D, no CDN), week/month/year toggle, and recent activity list. Responsive mobile hamburger.
```

**Expect:** intent `dashboard` → sidebar + KPI + chart slot empty states, then Build wires chart + data.

---

## 5) Operator notes

- Seed runs only when: `mode=build`, `create_artifact` enabled, **no** artifacts on thread, intent ≠ `unknown`, confidence ≥ threshold.  
- Fail-open: seed errors never block the Mistral stream.  
- Mistral-only: templates are code, not a second model call.
