# Scorecard Prompt 1 — Builder fit (D1–D11)

Canonical **Lane K / SCORECARD-BUILDER** prompt. Use against a generated or reference HTML artifact. **No repository edits.**

Related one-tap polish chips (not a substitute for this scorecard): `ARTIFACT_POLISH_ACTIONS` in [`src/lib/agent/prompts.ts`](../../src/lib/agent/prompts.ts) — mobile-first, theme, a11y, visual, export, background.

---

## Claude — SCORECARD-BUILDER (copy-paste)

```text
ROLE
Si QA + product auditor pre COSY / NEXIFY Forge **Builder** (TanStack Start).
Builder dnes = Mistral chat (Plan=Large, Build=Codestral) → HTML/artifact na live canvas → share public artifacts.
NIE JE to plný design-canvas editor, nie Figma, nie Next.js fullstack.

INPUT
Priložený súbor: [vlož BookSlot index.html / alebo iný artifact HTML]
Toto je REFERENČNÝ cieľový výstup (jednoduchý, ale plne funkčný produktový demo).

ÚLOHA
Ohodnoť, ako dobre by NÁŠ Builder tento výsledok dnes dokázal vytvoriť / udržiavať — nie či je HTML „pekné samo o sebe“.
Zapisuj dáta do tabuľky. Buď prísny. Žiadne marketingové frázy.

STUPNICA (každá dimenzia 1–5)
1 = Builder to dnes prakticky nezvládne / zlý fit
2 = len hrubý skelet, veľa manuálnej práce
3 = použiteľné demo s viditeľnými medzerami
4 = blízko cieľa s drobnými zásahmi
5 = Builder by to vedel spoľahlivo doručiť end-to-end

DIMENZIE (povinné) — D1–D11 skóruj; D12 oddelene
| ID | Dimenzia | Skóre 1–5 | Evidence (konkrétny feature v HTML) | Builder gap | Severity (P0/P1/P2) |
|----|----------|-----------|--------------------------------------|-------------|---------------------|
| D1 | Single-file HTML artifact fit (canvas preview) | | | | |
| D2 | Booking flow completeness (service→date→slot→form→confirm) | | | | |
| D3 | Slot engine (working hours, duration, conflict / double-book guard) | | | | |
| D4 | Stav + persistencia (localStorage, survive refresh) | | | | |
| D5 | Staff ops (list/filter + Confirm/Complete/Cancel) | | | | |
| D6 | Cancel-by-ID+email (customer self-serve) | | | | |
| D7 | Validation + empty states + toasts (no dead controls) | | | | |
| D8 | Responsive (mobile-first, desktop 2-col) | | | | |
| D9 | A11y (labels, focus, dialog/Escape) | | | | |
| D10| Promptability (1–3 Build prompty stačia na reprodukciu) | | | | |
| D11| Iterácia opravou cez chat bez rozbitia slot logiky | | | | |
| D12| Production readiness (auth, real DB, payments) — oddelené, očakávaj nízke | | | | |

AGREGÁT
- Priemer D1–D11 (D12 reportuj oddelene ako out-of-scope product)
- Verdict: POOR / MIXED / GOOD / EXCELLENT
  (priemer: ≤2.0 / ≤3.0 / ≤4.0 / >4.0)
- Top 5 P0/P1 gaps podľa dopadu na Builder kvalitu

VÝSTUP FORMÁT (presne)
1) Executive verdict (3 vety)
2) Scorecard tabuľka (vyplnená)
3) JSON block:
{
  "artifact": "bookslot",
  "builder_fit_avg_d1_d11": 0,
  "verdict": "",
  "scores": {"D1":0,"D2":0,"D3":0,"D4":0,"D5":0,"D6":0,"D7":0,"D8":0,"D9":0,"D10":0,"D11":0,"D12":0},
  "top_gaps": [{"id":"","severity":"P0","gap":"","evidence":""}],
  "what_builder_already_handles": [],
  "recommended_builder_improvements": [],
  "manual_test_checklist": [
    "create booking",
    "refresh → still present",
    "staff status transitions",
    "cancel frees slot",
    "double-book blocked"
  ]
}
4) 5 konkrétnych Build promptov na empirické overenie skóre v našom Builderi

ZAKÁZANÉ
- Nehodnoť ako marketing landing / welcome page
- Nevymýšľaj features, ktoré HTML nemá
- Nepíš „vyzerá cool“ bez evidence
- Nesúď platby/SMS/backend ako fail Buildera, ak boli out of scope — daj ich do D12
- Žiadne úpravy repozitára
```

---

## Rubrika — čo meria každá dimenzia

| ID      | Kritérium (1–5)         | Čo hľadáš v HTML / čo Builder musí vedieť                                              |
| ------- | ----------------------- | -------------------------------------------------------------------------------------- |
| **D1**  | Single-file canvas fit  | Jeden self-contained HTML (inline CSS/JS), funguje v sandboxed preview, bez broken CDN |
| **D2**  | Core user flow          | Kompletný happy path (BookSlot: service→date→slot→form→confirm) bez TODO/dead CTA      |
| **D3**  | Domain engine           | Pravidlá domény (sloty/konflikty / ekvivalent) — nie len UI                            |
| **D4**  | Persistence             | localStorage (try/catch), refresh zachová stav                                         |
| **D5**  | Operator / staff mode   | Zoznam + filter + status transitions                                                   |
| **D6**  | Self-serve reverse path | Cancel/undo s overením identity (ID+email)                                             |
| **D7**  | UX integrity            | Validácia, empty states, toasty; žiadne mŕtve controls / `alert()`                     |
| **D8**  | Responsive              | Mobile-first ~390px; desktop layout; žiadny page horizontal scroll                     |
| **D9**  | A11y                    | Labels, focus, Escape na dialógoch, keyboard                                           |
| **D10** | Promptability           | Reprodukovateľné 1–3 Build promptami                                                   |
| **D11** | Safe iteration          | Chat / `edit_file` opravy nerozbijú core engine                                        |
| **D12** | Prod readiness          | Auth/DB/payments — **out of scope** produktu Buildera dnes (reportuj oddelene)         |

---

## Adaptation (non-BookSlot HTML)

Ak artifact **nie je** booking (napr. Ops Desk), mapuj význam dimenzií a v JSON uveď `"artifact": "<name>"` + upravený checklist:

| ID             | BookSlot (canonical) | Ops Desk / generic dashboard                   |
| -------------- | -------------------- | ---------------------------------------------- |
| D2             | Booking flow         | Interaktivita (filtre, drawer, modal, palette) |
| D3             | Slot engine          | Stavové UI / workflow konzistencia             |
| D5             | Staff ops            | Primary operator actions                       |
| D6             | Cancel self-serve    | Secondary self-serve / undo path               |
| D1, D4, D7–D11 | rovnaký význam       | rovnaký význam                                 |
| D12            | production readiness | production readiness                           |

Ops Desk historicky používal D1–D9 (+ production out-of-scope). Pre backlog **SCORECARD-BUILDER** používaj **D1–D11** (+ D12 oddelene) tabuľku vyššie.
