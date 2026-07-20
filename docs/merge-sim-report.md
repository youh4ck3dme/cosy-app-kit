# Merge simulation report: `main` (Claude #3) ↔ `developeredit`

**Date:** 2026-07-20  
**Sandbox:** git worktree (discarded after run)  
**Base A:** `origin/developeredit` @ `c5ecc99`  
**Base B:** `origin/main` @ `fa59014` (PR #3 merged)

---

## Experiment

| Direction | Result |
|-----------|--------|
| `main` → `developeredit` | **13 conflict files**, merge stopped |
| `developeredit` → `main` | **same 13 conflict files** |

### Conflict files (both directions)

| File | ~conflict hunks | Risk |
|------|-----------------|------|
| `Canvas.tsx` | **24** | 🔴 critical UI |
| `chat.$threadId.tsx` | **13** | 🔴 chat shell |
| `MessageList.tsx` | 6 | 🟠 |
| `Composer.tsx` | 5 | 🟠 |
| `Header.tsx` | 3 | 🟠 |
| `AgentSettingsPanel.tsx` | 2 | 🟡 |
| `a.$artifactId.tsx` | 2 | 🟡 |
| `CommandPalette.tsx` | 1 (add/add) | 🟠 duplicate implementations |
| `threads.functions.ts` | 1 | 🟠 API surface |
| `types.ts` | 1 | 🟡 |
| `styles.css` | 1 | 🟡 tokens |
| `package.json` | 1 | 🟡 deps |
| `bun.lock` | 1 | 🟢 regenerate |

### Came in clean from Claude (good news)

- PWA: `public/sw.js`, manifest, offline, icons  
- `register-sw.ts`, `haptics.ts`, hooks (`use-thread-mutations`, `use-global-shortcuts`)  
- Many `ai-elements` prettier-only touches  
- OmniOps `src/lib/agent/tools.ts` + Monaco still present after merge attempt (not deleted by auto-merge)

---

## Probability model (honest)

Assumptions: one experienced person, tests + build required, no force-push `main` without review.

| Strategy | Chance we “don’t mess it up”* | Notes |
|----------|-------------------------------|--------|
| **A. Full merge + resolve all 13 files in one day** | **25–35%** | Easy to lose Monaco or hybrid tools in Canvas/chat conflicts |
| **B. Full merge, 2–3 careful days + smoke** | **55–70%** | Doable if always prefer OmniOps agent + Cursor Monaco, then re-apply Claude UX |
| **C. Cherry-pick slices only (PWA, haptics, optimistic…)** | **80–90%** | Already started on local `developeredit`; lowest risk |
| **D. Two-track forever (main=Claude, developeredit=OmniOps)** | **90%+ no breakage of either** | But product splits; eventually still need B or C |
| **E. Reset main to developeredit (force)** | **15% “political/safe”** | Technically easy, high chance of losing Claude-only work + Lovable history drama |

\*“Neposrať” = build green + chat works + canvas preview + no silent loss of Mistral tools or C★ Monaco.

### Overall recommendation score

| Goal | Best strategy | Est. success |
|------|---------------|--------------|
| Ship one unified app without drama | **C then optional B later** | **~85%** |
| Get OmniOps onto `main` ASAP | PR `developeredit`→`main` with **ours for shell**, take PWA from main | **~60%** if one long conflict session |
| Zero merge work today | **D** | high short-term, debt later |

---

## What the sandbox did NOT include

Local unpushed commits (`a24e394` C★, `4943f11` PWA port) were **not** on `origin/developeredit` tip used in sim.  
Merging with those present makes **Canvas / chat / Composer slightly harder** (more ours), but PWA port reduces need for Claude PWA conflict.

---

## Safe next steps

1. Push `developeredit` (C★ + PWA).  
2. Continue **C** (cherry-pick): optimistic threads, etc.  
3. Do **not** `git merge origin/main` on production branch until a dedicated conflict session with the table above.  
4. Optional: freeze PR #4 (light mode) until strategy chosen.  
