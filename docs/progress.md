# Builder Progress Log

**Účel:** sledovať kvalitu **Builder platformy** aj **výstupov artefaktov** po každej úprave.  
**Baseline dôkaz (2026-07-20):** 3× dashboard HTML vygenerované ~za 30 s → pipeline chat → Mistral → canvas → export funguje.

## Builder Power Index (BPI)

```text
BPI = (Artefakt/10) × (Platform/10) × SpeedFactor
SpeedFactor = baseline_edit_s / current_edit_s   (follow-up edit)
Baseline: Artefakt 7.0, Platform 4.5, edit ~30 s → SpeedFactor 1 → BPI₀ ≈ 0.315
M6 target: Artefakt ≥9, Platform ≥9, edit ≤5 s → SpeedFactor ≥6 → BPI₆ ≈ 4.86
```

---

## Rubrika 0–10

| Dimenzia | Čo meráme |
|----------|-----------|
| **Speed** | Čas od promptu po renderovateľný artefakt |
| **Completeness** | Self-contained HTML, layout, dáta, chart/UI bloky |
| **Interactivity** | Sidebar toggle, filtre, reálne JS |
| **Visual craft** | Typografia, farby, anti-cliché |
| **Responsive** | `@media` / mobile sidebar / touch |
| **A11y** | `aria-*`, focus, keyboard |
| **Mobile polish** | safe-area, dvh, 44px targets |
| **Platform** | Tools, memory, palette, canvas, boundaries |

---

## Baseline — 3 artefakty (2026-07-20)

| Súbor | Skóre |
|-------|-------|
| `index (4).html` | 6.5 |
| `index (3).html` | 7.5 |
| `index (2).html` | 7.0 |
| **Priemer** | **7.0** |

| Metrika | Skóre |
|---------|-------|
| Pipeline | **10 / 10** |
| Artefakt | **7.0 / 10** |
| Platform | **4.5 / 10** |
| Celkom (vážené) | **7.0 / 10** |
| BPI | **0.315** |

---

## Progress tabuľka

| Dátum | Snapshot / zmena | Pipeline | Artefakt | Platform | Celkom | BPI | Δ | Dôkaz |
|-------|------------------|----------|----------|----------|--------|-----|---|-------|
| 2026-07-20 | **BASELINE** — fence HTML, 3× dash ~30 s | 10 | 7.0 | 4.5 | 7.0 | 0.315 | — | Downloads index (2)(3)(4) |
| 2026-07-20 | **M1–M6 ship** — hybrid tools, prompts, palette, canvas diff, memory, SEO/boundaries, starters, vitest, iPhone safe-area | 10 | 8.0* | 8.5 | 8.7 | ~1.4† | ↑ | code on `developeredit`; *prompt quality pending live regen; †edit cycle via `edit_file` (est. ≤10 s vs 30 s) |
| 2026-07-20 | **Cursor C0+C1** — 420 share, palette export/memory, Monaco code+diff, console filters, network panel, fullscreen | 10 | 8.0* | 9.0 | 9.0 | ~1.5† | ↑ | UI only; BPI still needs live samples |

\* Artefakt 8.0 = expected after system-prompt anti-cliché + Codestral Build routing; re-score with fixed prompt suite after next live gen.  
† SpeedFactor ~3 until measured with stopwatch on `edit_file` turn.

### Checklist po ďalšom live gen

```
Prompt: dark ops dashboard with Chart.js
Čas first preview: ___ s
Čas edit_file follow-up: ___ s
Artefakt skóre: _ / 10
```

---

## Changelog

| Dátum | Čo |
|-------|----|
| 2026-07-20 | Baseline + BPI |
| 2026-07-20 | M1–M6 implementation pass logged |
