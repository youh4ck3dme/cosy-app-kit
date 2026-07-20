# Cursor mega-prompt A→Z (copy-paste whole block below)

---

```
You are Cursor (Composer / IDE agent) on OmniOps Builder — parallel world B.

═══════════════════════════════════════════════════════════════════
MISSION
═══════════════════════════════════════════════════════════════════
Execute the FULL Cursor track A→Z until C★ is true (or only remaining
letters if A–G already done). Work continuously in one long run:
verify-or-skip completed phases, implement missing ones end-to-end,
update docs/cursortodo.md progress tracker after each letter.

Primary source of truth (read fully first):
  docs/cursortodo.md
  docs/agent-tools.md
  docs/migrations.md
  docs/keyboard.md
  docs/todo.md (hub only)

═══════════════════════════════════════════════════════════════════
HARD RULES (never break)
═══════════════════════════════════════════════════════════════════
1. Branch: developeredit ONLY.
2. NEVER: git push origin main, force-push, rebase published history.
3. NEVER edit Grok-owned files:
     src/routes/api/chat.ts
     src/routes/api/ai-status.ts
     src/lib/agent/**
     src/lib/models.ts
     src/lib/ai-gateway.server.ts
     supabase/migrations/**
4. Product AI = Mistral only. No OpenAI / Gemini / Lovable Gateway chips or paths.
5. Secrets: never commit .env / keys.
6. Do NOT enable ESLint as CI gate. Do NOT mass-reformat whole repo.
7. After each phase: bunx tsc --noEmit. Before claiming C★: bun run build.
8. Prefer small focused commits on developeredit IF user asked; otherwise
   leave a clean summary of files. Do not open PR to main unless human says.
9. If blocked on missing DB table for versions: implement UI + friendly
   empty/error state, document "apply migration 20260720120000", CONTINUE
   to next letter — do NOT invent SQL schema.

═══════════════════════════════════════════════════════════════════
ALLOWED PATHS (edit freely)
═══════════════════════════════════════════════════════════════════
src/components/app-shell/**
src/components/ai-elements/**
src/components/ui/**
src/components/canvas/**
src/components/templates/**          # create
src/components/onboarding/**         # create
src/hooks/**
src/lib/starters.ts
src/lib/export-artifact.ts
src/lib/edit-snippets.ts
src/lib/utils.ts
src/lib/templates.seed.ts            # create
src/styles.css
src/routes/index.tsx
src/routes/auth.tsx                  # SEO/UI only
src/routes/a.$artifactId.tsx
src/routes/a.$artifactId.embed.tsx   # create if needed
src/routes/templates.tsx             # create
src/routes/templates.$slug.tsx       # create
src/routes/_authenticated/**         # careful: do not rip chat transport
e2e/**
docs/keyboard.md
docs/cursortodo.md
public/**

Shared (minimal patches only):
  chat.$threadId.tsx — layout, palette, focus, suggestions wiring
  MessageList.tsx — chips, quote, tool cards
  threads.functions.ts — CONSUME via useServerFn only, never rewrite tools

═══════════════════════════════════════════════════════════════════
GROK CONTRACTS (consume — already shipped)
═══════════════════════════════════════════════════════════════════
- truncateThreadMessagesAfter — wired; do not break edit/retry
- data-artifact-created / data-memory-saved / data-plan — onData toasts/focus
- edit_file beforeSnippet/afterSnippet — DiffEditor (via edit-snippets.ts)
- exportArtifactDownload — palette Export ZIP
- STARTERS — empty state / palette
- listArtifactVersions({ data: { artifactId, limit? } })
- restoreArtifactVersion({ data: { versionId } })
- suggestFollowups({ data: { lastAssistantText? } }) → { suggestions, source }
  (optional; static STARTERS fallback OK)

═══════════════════════════════════════════════════════════════════
EXECUTION ALGORITHM
═══════════════════════════════════════════════════════════════════
0. git status; stay on developeredit; pull if needed.
1. bun test && bunx tsc --noEmit (baseline green expected).
2. Read docs/cursortodo.md progress tracker.
3. For each letter A…L in order:
     a. Inspect codebase for acceptance criteria of that letter.
     b. If ALREADY fully met → mark ✅ in tracker, SKIP implementation.
     c. If PARTIAL → finish remaining items only.
     d. If MISSING → implement fully to acceptance.
     e. Run tsc (and build after F/G/J/K/L heavy changes).
     f. Update progress tracker row for that letter.
4. When A–L acceptance met (H may be UI-only if SQL not applied):
     set C★ ✅ and print final report.

Current expected state as of 2026-07-20 EOD (verify, don't assume):
  A B C D E F G = likely DONE
  H I J K L = remaining → YOUR MAIN WORK

═══════════════════════════════════════════════════════════════════
PHASE SPECS (A→Z)
═══════════════════════════════════════════════════════════════════

### A — Orient
- Confirm green tests/tsc; read agent-tools.md.
- Acceptance: tsc green; no forbidden files touched.

### B — Unify & tidy
- Mobile width 420 on public share + canvas; useMemo artifacts; no
  conditional hooks; aria-label on icon-only buttons (Header/Canvas/MessageList).
- Acceptance: tsc clean; 420 consistent.

### C — Command palette
- Export ZIP via exportArtifactDownload; Copy share link; all 4 STARTERS;
  model switch updateThreadModel; Memory → open settings; keyboard.md sync.
- Acceptance: Cmd+K covers export + model + starter.

### D — Artifact focus
- onData data-artifact-created → setActiveArtifactId + setView("preview");
  toast; highlight successful create_artifact tool card.
- Acceptance: tool create focuses canvas artifact.

### E — Chat UX depth
- Quote → insert "> …" into composer draft.
- Tool labels per agent-tools.md.
- Suggestion chips under last assistant: try suggestFollowups, else static STARTERS;
  click fills composer, no auto-send.
- Composer DnD images max 4, size toast, data URLs.
- Branch button disabled + tooltip "Coming soon".
- Acceptance: quote + chips + DnD work; no GPT.

### F — Monaco code tab
- Files: src/components/canvas/MonacoEditor.tsx, monaco-theme.ts
- React.lazy + client-only mount gate (no SSR window crash).
- Languages: html css js ts json markdown; minimap off < md.
- Keep edits map, Save → updateArtifactFiles, 400ms preview refresh.
- Acceptance: multi-file tabs, save+preview, bun run build green.

### G — Monaco DiffEditor
- File: MonacoDiff.tsx (+ edit-snippets from tool parts).
- Default: original vs local buffer.
- Toggle "Show model change" when beforeSnippet/afterSnippet present.
- Accept → preview; Revert → restore/undo.
- Acceptance: model edit visible in Diff tab.

### H — Version timeline (NEXT if A–G done)
- useServerFn(listArtifactVersions) + restoreArtifactVersion.
- Canvas header timeline newest-first; badges: tool|fence|user_save|restore.
- Restore confirm → restore → invalidate ["thread", threadId].
- Empty: "No versions yet — save or let the agent edit."
- If relation missing: show error "Apply migration (docs/migrations.md)" and CONTINUE.
- Acceptance: list+restore works when SQL applied; graceful otherwise.

### I — Console + Network + preview UX
- Console filter chips: all|log|warn|error.
- NetworkPanel / fetch interceptor in iframe bridge (may already exist — finish polish).
- Fullscreen preview (F outside inputs) + Esc.
- Custom width + localStorage key builder:device:{threadId}.
- Comment iframe sandbox decision in code.
- Acceptance: filters work; network captures ≥1 fetch in sample; fullscreen OK.

### J — Templates + onboarding + landing
- Create static seed src/lib/templates.seed.ts (8–12 templates).
- Routes: templates.tsx, templates.$slug.tsx + components/templates/*.
- SEO head() unique per page.
- Use template → createThread + seed prompt in composer (NOT auto-send).
- Unauth: sessionStorage + /auth redirect.
- Tour.tsx 3 steps: Composer → Canvas → Cmd+K; once via localStorage
  (or profiles.onboarded_at if available — do not invent migration).
- Landing / : "Made with Builder" section; hide if no public artifacts.
- Acceptance: templates browsable; Use lands on chat with prompt; tour once.

### K — Share v2 + embed + a11y
- Share modal: preview card, copy link, copy embed, ZIP.
- Route embed minimal chrome + "Made with Builder" badge
  (a.$artifactId.embed.tsx or equivalent).
- Optional lazy QR.
- a11y: role="log" messages, skip-link, focus-visible audit, empty states.
- Acceptance: public share + embed render; no critical a11y misses on new UI.

### L — Playwright e2e (local only — NOT CI)
- e2e/palette.spec.ts — Cmd+K open/Esc
- e2e/share-public.spec.ts if fixture exists
- Optional soft chat smoke
- Do NOT add Playwright to GitHub CI workflow.
- Acceptance: bunx playwright test green locally if browsers installed;
  if install blocked, document skip and still mark L with note.

### C★ — Done criteria
- [ ] A–G verified or implemented
- [ ] H implemented (UI graceful if no SQL)
- [ ] I J K done
- [ ] L done or documented skip
- [ ] bunx tsc --noEmit green
- [ ] bun run build green
- [ ] docs/cursortodo.md tracker fully updated
- [ ] main never pushed
- [ ] Final summary for human

═══════════════════════════════════════════════════════════════════
ORDER OF WORK (one continuous run)
═══════════════════════════════════════════════════════════════════
1. Verify A–G quickly (skip if green).
2. Implement H (versions UI).
3. Implement I (console/network/fullscreen polish).
4. Implement J (templates + tour + landing).
5. Implement K (share/embed/a11y).
6. Implement L (local e2e or documented skip).
7. Final tsc + build.
8. Update tracker → C★.
9. STOP and report.

═══════════════════════════════════════════════════════════════════
FINAL REPORT FORMAT (required)
═══════════════════════════════════════════════════════════════════
## Cursor A→Z report
- Branch / HEAD
- Letters completed this run: …
- Letters skipped (already done): …
- Blocked: … (e.g. SQL not applied)
- Files created / modified (bulleted)
- Commands: test / tsc / build results
- C★: yes/no
- Human next: apply migration? smoke? PR?

Do not wait for permission between letters. Drive A→Z (or H→C★) to completion.
```

---

## How to use

1. Open Cursor Composer on branch `developeredit`.  
2. Paste the fenced block **from `You are Cursor` through the end**.  
3. Let it run; human only needed for Supabase SQL apply if H errors on missing table.  

## Status snapshot (for human)

| Letters | Status EOD 2026-07-20 |
|---------|------------------------|
| A–G | Done |
| H–L | Remaining (mega-prompt will finish these) |
| C★ | Not yet |
