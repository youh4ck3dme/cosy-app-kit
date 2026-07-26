# Blueprint: +40% mobile preview & responsive artifacts

**ID:** `MR-40`  
**Branch:** `developeredit` only  
**Goal:** From “platform fixed, output uneven” → **reliable mobile-first previews + better generated HTML**  
**Target delta:** ~**+40%** perceived mobile quality (platform 8→9, artifact mobile craft 6→8.5)  
**Owner split:** Grok (agent/prompt/gate) · Cursor (Canvas UX) · Human (smoke on real phone)  
**Depends on:** already landed defaults (phone → mobile device, visible switcher, honest width label, `prompt_rev 2026-07-20-c`)  

**Progress:** **M1 ✅ · M2 ✅ · M3 ✅ · M4 ✅** (2026-07-20)

---

## 0. Problem (what +40% is solving)

| Layer | Today | Pain |
|-------|--------|------|
| **A. Frame** | `width: target; maxWidth: 100%` | On phone, desktop/tablet/mobile paint the **same** ~390px — switcher feels useless; users misread “desktop” |
| **B. Generation** | Prompt says mobile-first | Model still ships desktop grids that **squeeze**, not reflow |
| **C. Feedback** | No score / warning | User discovers “not mobile” only by eye |
| **D. Iterate** | Manual “make it mobile” | No one-click polish path |

**+40% = A+B+C+D together**, not another prompt-only tweak.

---

## 1. Success metrics (definition of done)

After this blueprint ships + one live smoke:

| Metric | Before (now) | After MR-40 |
|--------|--------------|-------------|
| Phone open → device default | mobile (done) | mobile + **fluid host** mode |
| Device switcher on phone **changes layout** | mostly no (all clamp equal) | **yes** via true device simulation |
| New Build dashboard has hamburger closed @390 | ~50% | **≥85%** (gate + prompt + chip) |
| No horizontal scroll @390 on sample suite | hit-or-miss | **0 fails** on 4 golden prompts |
| User sees mobile quality signal | none | **score chip** or warn toast |
| Time to fix bad mobile layout | rewrite prompt | **1 tap** “Make mobile-first” |

**BPI note:** re-score 1 live dashboard on phone after ship; log in `docs/progress.md`.

---

## 2. Architecture (one pipeline)

```text
                    ┌─────────────────────────────┐
  User on phone ───▶│ Canvas preview modes        │
                    │  fluid | mobile | tablet |  │
                    │  desktop (scaled sim)       │
                    └─────────────┬───────────────┘
                                  │ painted CSS width
                                  ▼
                    ┌─────────────────────────────┐
  Build turn ──────▶│ Mistral + mobile-first      │
                    │ prompt_rev + mode hint      │
                    └─────────────┬───────────────┘
                                  │ HTML artifact
                                  ▼
                    ┌─────────────────────────────┐
                    │ responsiveGate (pure)       │
                    │ viewport · @media · min-w   │
                    │ hamburger heuristic         │
                    └─────────────┬───────────────┘
                                  │ score + hints
                    ┌─────────────▼───────────────┐
                    │ UI: badge / toast / chip    │
                    │ "Make mobile-first" edit    │
                    └─────────────────────────────┘
```

---

## 3. Work packages (single PR stack, 4 slices)

Implement **in order**. Each slice is shippable alone; full +40% needs all four.

### Slice M1 — True device simulation (Canvas) · **+15%**

**Why:** Today all devices clamp to host width → switcher lies on phones.

**Design:**

| Mode | Iframe layout width | Fit strategy |
|------|---------------------|--------------|
| **fluid** (default on host &lt;640) | `100%` of canvas content box | no scale — real phone viewport |
| **mobile** | `390` (or 420) | if host wider, center frame; if host narrower, width=100% |
| **tablet** | `768` | if host &lt; 768: iframe **768px** + `transform: scale(host/768)` + `transformOrigin: top center` so **media queries see 768** |
| **desktop** | `1200` | same scale trick so **media queries see 1200** |

**Critical rule:**  
- **Fluid / natural phone** = paint width = host (honest mobile).  
- **Simulate larger device on small host** = fixed iframe width + **CSS scale**, NOT `maxWidth:100%` only (that collapses MQ viewport).

**Files:**
- `src/components/app-shell/Canvas.tsx` — frame math, scale wrapper, modes
- optional tiny helper `src/lib/preview-frame.ts` — pure `computeFrame({ device, hostWidth, zoom })`

**API sketch:**
```ts
type PreviewMode = "fluid" | "mobile" | "tablet" | "desktop";

function computeFrame(mode: PreviewMode, hostW: number, zoom: number) {
  const targets = { fluid: hostW, mobile: 390, tablet: 768, desktop: 1200 };
  const target = mode === "fluid" ? hostW : targets[mode];
  const scale =
    mode === "fluid" || hostW >= target ? 1 : hostW / target;
  return {
    iframeWidth: target,
    scale: scale * zoom,
    outerWidth: target * scale * zoom,
    mediaWidth: target, // what @media sees
  };
}
```

**UX:**
- Default on host &lt;640: **`fluid`** (best “this is my phone”).
- Show 4 toggles: Fluid | 📱 | ▤ | 🖥 (Fluid replaces silent clamp).
- Badge: `media 390 · paint 390` vs `media 1200 · scale 0.32`.
- Persist mode in existing `builder:device:${threadId}` JSON (`mode` field).

**Acceptance:**
- [ ] On iPhone-width, Fluid → layout uses ~device width, MQ mobile fires.
- [ ] Desktop mode on phone → iframe layout width 1200 (scaled), desktop grid visible (proves sim works).
- [ ] Mobile mode on desktop browser → 390 centered frame.
- [ ] No horizontal scroll of **Builder chrome** (only inside iframe if artifact bad).

---

### Slice M2 — Responsive gate (agent pure module) · **+10%**

**Why:** Catch bad HTML before user blames the frame.

**New file:** `src/lib/agent/responsive-gate.ts` (+ `responsive-gate.test.ts`)

**Heuristics (fast, no browser):**

| Check | Weight | Fail if |
|-------|--------|---------|
| `meta viewport` present | hard | missing |
| has `@media` or `max-width` / `min-width` queries | hard | none |
| `min-width` on body/html/main/wrapper &gt; 480 (regex) | soft | found |
| sidebar keywords without collapse pattern | soft | `sidebar` + no `hamburger`/`nav-toggle`/`aria-expanded` |
| `overflow-x: hidden` only on body without MQ | info | optional |

```ts
export type ResponsiveReport = {
  score: number;        // 0–100
  ok: boolean;          // score >= 70
  hardFails: string[];
  softFails: string[];
  hints: string[];      // short edit suggestions
};

export function analyzeResponsiveHtml(html: string): ResponsiveReport;
```

**Wire (pick one, prefer light touch):**
1. **Client (recommended first):** after artifact load in Canvas, run gate on entry HTML → badge color + toast once per artifact id if `!ok`.
2. **Server (optional M2b):** after `create_artifact` / fence persist, attach `data-responsive` stream part `{ score, ok, hints }` — Cursor shows chip under canvas title.

**Do not** block save/create on fail (too aggressive). **Do** surface score.

**Acceptance:**
- [ ] 8 unit fixtures: good mobile-first, desktop-only, missing viewport, etc.
- [ ] Score visible in Canvas chrome when preview open.

---

### Slice M3 — Generation quality (prompt + one-tap polish) · **+10%**

**Why:** Gate without better generation only nags.

**3.1 Prompt (Grok)**  
- Keep mobile-first rules in `DEFAULT_SYSTEM_PROMPT`.  
- Bump `PROMPT_REV` → `2026-07-20-d` when M3 lands.  
- Add **Build appendix** in `SYSTEM_BUILD`:

```text
Before finishing HTML: verify (mentally) viewport meta, base single-column,
sidebar closed by default under 768px, no min-width > 100% on wrappers.
```

**3.2 Host-aware hint (optional, high value)**  
When client sends chat body, include:
```ts
clientContext?: { previewMode: PreviewMode; hostWidth: number }
```
Server appends one line to system or user sidecar:
`User is viewing on ~390px phone (fluid). Optimize first paint for that width.`

**Files:** `chat.$threadId.tsx` transport body · `api/chat.ts` compose.

**3.3 One-tap chip “Make mobile-first”**  
Under canvas or last assistant:
- Fills composer (or auto-sends if product allows) with fixed edit prompt:

```text
Rewrite this artifact mobile-first for 390px:
1) single column 2) sidebar/nav closed by default with hamburger
3) no horizontal scroll 4) charts/cards full width under 768px
5) keep colors/brand. Use edit_file, don't recreate from scratch if possible.
```

**Acceptance:**
- [ ] New gens include viewport + @media on 3/3 smoke prompts.
- [ ] Chip produces improved layout in one turn on a known desktop-only sample.

---

### Slice M4 — Smoke + golden suite · **+5%**

**Why:** Lock the +40% so it doesn’t regress.

| Item | Detail |
|------|--------|
| Golden HTML fixtures | `docs/samples/2026-07/mobile-gate/` — 2 good, 2 bad |
| Vitest | gate tests on fixtures |
| Manual smoke addendum | `docs/smoke-checklist.md` § Mobile preview |
| Optional Playwright | local only: open chat page at 390, assert device toggle + badge |

**Smoke bullets to add:**
- [ ] Fluid default on 390 viewport  
- [ ] Desktop sim scales, media width stays 1200  
- [ ] New “ops dashboard” → no horizontal scroll, hamburger works  
- [ ] Gate score ≥70 or chip shown  

---

## 4. What NOT to do (scope control)

| ❌ | Why |
|----|-----|
| Full Claude merge for “better UI” | Conflict risk; not needed |
| Puppeteer in Worker on every gen | Cost/latency; gate is regex-first |
| Force-rewrite HTML on server | Surprises users; break intentional desktop art |
| Second CommandPalette | Out of scope |
| Change Mistral provider | Forbidden product rule |
| Touch `main` | PR only on human order |

---

## 5. Implementation order & estimates

| Slice | Owner | Est. | Ships alone? |
|-------|-------|------|--------------|
| **M1** frame sim + fluid | Cursor / Grok UI | 2–3 h | yes (+15%) |
| **M2** gate + badge | Grok | 1.5–2 h | yes (+10%) |
| **M3** prompt + chip + optional clientContext | Grok + thin UI | 1.5–2 h | yes (+10%) |
| **M4** fixtures + smoke | Grok | 45 min | yes (+5%) |

**Total:** ~1 focused day · **one blueprint · 1–2 commits on `developeredit`**

Recommended commit split:
1. `feat(canvas): fluid + scaled device simulation (M1)`  
2. `feat(agent): responsive gate + mobile polish chip (M2–M3)`  
3. `test/docs: mobile gate fixtures + smoke (M4)`

---

## 6. File ownership map

| Path | Slice | Track |
|------|-------|-------|
| `src/lib/preview-frame.ts` | M1 | shared pure |
| `src/components/app-shell/Canvas.tsx` | M1, M2 UI | Cursor-ok / Grok-ok coordinated |
| `src/lib/agent/responsive-gate.ts` | M2 | Grok |
| `src/lib/agent/responsive-gate.test.ts` | M2 | Grok |
| `src/lib/models.ts` / `prompts.ts` | M3 | Grok |
| `src/routes/api/chat.ts` | M3 clientContext | Grok |
| `src/routes/_authenticated/chat.$threadId.tsx` | M3 body + chip | coordinated |
| `docs/smoke-checklist.md` | M4 | either |
| `docs/samples/2026-07/mobile-gate/*` | M4 | Grok |
| `docs/progress.md` | after live | Grok |

---

## 7. Risk register

| Risk | Mitigation |
|------|------------|
| Scale sim blurs text | `transform: scale` only when host &lt; target; label “simulated” |
| Gate false positives | soft vs hard fails; never block persist |
| clientContext privacy | only width + mode enum, no PII |
| LS migration | accept old `{ device }` → map desktop/tablet/mobile; add `fluid` |
| Double scroll (page + iframe) | outer `overflow-x: hidden` on canvas pane only |

---

## 8. Parallel agent prompts (copy-paste)

### Prompt — implement M1+M2 (recommended start)

```
You are OmniOps on developeredit only. Never push main.

Read docs/MOBILE_RESPONSIVE_40_BLUEPRINT.md. Implement slices M1 and M2:
1) src/lib/preview-frame.ts + Canvas true device simulation (fluid default on host <640;
   tablet/desktop use fixed iframe width + CSS scale so media queries see target width).
2) src/lib/agent/responsive-gate.ts + tests; show score badge in Canvas preview chrome.

Do not full-merge Claude branches. Do not edit tool execute logic except optional
data part later. bun test && bunx tsc --noEmit. Commit on developeredit.
```

### Prompt — M3+M4 follow-up

```
Continue MR-40 on developeredit: M3 prompt_rev bump, optional clientContext hostWidth/mode
in chat body, "Make mobile-first" chip; M4 fixtures + smoke checklist bullets.
bun test && tsc. Update docs/progress.md only after human live smoke note.
```

---

## 9. Human after ship

1. Real phone or DevTools 390.  
2. New thread → dashboard prompt.  
3. Confirm Fluid + score badge.  
4. Toggle Desktop sim → should look “wide then scaled”.  
5. If score &lt;70 → tap **Make mobile-first** once.  
6. Optional: apply nothing SQL for this blueprint (no migration).

---

## 10. One-line strategy

**Stop lying with `maxWidth:100%` alone; simulate real CSS viewports; score HTML; one-tap fix; lock with fixtures.**

That stack is the **single best +40%** over prompt-only or UI-only fixes.
