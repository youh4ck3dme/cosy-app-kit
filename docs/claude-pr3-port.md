# Claude PR #3 → `developeredit` port checklist

**Source:** branch `origin/claude/app-quality-overhaul-y6cv3u` · [PR #3](https://github.com/youh4ck3dme/cosy-app-kit/pull/3)  
**Target:** `developeredit` only · **Never** merge PR #3 into `main` as-is  
**Compare (GitLens):** From `origin/developeredit` → To `origin/claude/app-quality-overhaul-y6cv3u`

---

## Disposition

| Decision | |
|----------|--|
| Full merge Claude → developeredit | ❌ Avoid |
| PR #3 → main raw | ❌ Avoid |
| Cherry-pick slices | ✅ Do this |

---

## TAKE / SKIP / LATER

| Path / feature | Tag | Status |
|----------------|-----|--------|
| `public/manifest.webmanifest`, `sw.js`, `offline.html`, `icons/*` | **TAKE** | ✅ ported |
| `src/lib/register-sw.ts` + root register | **TAKE** | ✅ ported |
| `src/lib/haptics.ts` | **TAKE** | ✅ ported (+ send haptic) |
| `src/lib/motion.ts` | **TAKE** | ✅ lib only (wire later if needed) |
| `use-thread-mutations.ts` | **TAKE** | ⏳ later (S3) |
| Stick-to-bottom scroll | **LATER** | MessageList already C★ |
| Canvas postMessage token | **LATER** | S5 careful on Monaco canvas |
| `use-global-shortcuts` / ShortcutsDialog | **SKIP** merge | Use ours; gap-fill only |
| Claude CommandPalette | **SKIP** | Ours richer |
| Claude `templates.ts` | **SKIP** | Have seed + routes |
| Claude `20260720090000_artifact_versions.sql` | **SKIP** | Keep Grok `20260720120000_*` |
| Claude version UI in Canvas | **SKIP** | Have VersionTimeline |
| `scripts/smoke.ts` + `__tests__` | **LATER** | S7 optional |
| Prettier mass ai-elements | **SKIP** | Noise |

---

## Done this port session

- [x] Inventory doc  
- [x] S1 PWA  
- [x] S2 haptics/motion libs + send haptic  
- [ ] S3 optimistic threads  
- [ ] S5 canvas bridge token  
- [ ] Comment/close PR #3  

---

## Human

1. Push `developeredit` (incl. C★ + this port) with write credentials.  
2. On PR #3: “Do not merge — cherry-picking into developeredit.”  
3. Apply Grok SQL migration for versions restore.  
