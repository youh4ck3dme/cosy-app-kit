
# 🎁 BONUS PACK — 5 mega-promptov na finálny lesk

Posledná dávka promptov, ktoré posunú Builder z „funguje" do „ships na Product Hunt bez blushu". Každý prompt je copy-paste ready pre agenta, ~2000 slov, s konkrétnymi súbormi, DB zmenami a akceptačnými kritériami.

Kompletná mapa: **P11 Polish · P12 Security · P13 PWA · P14 Stack Audit · P15 Performance & Launch**.

---

## PROMPT 11 — Final Polish Pass (visual + micro-interactions + copy)

**Cieľ:** premeniť UI z „čisté" na „premium". Každá plocha musí mať intencionálny detail — nie prázdne miesta, nie generické spinnery, nie robotické error hlášky.

**Rozsah práce:**

1. **Vizuálny audit celej aplikácie** — prejdi *každú* route (`/`, `/auth`, `/reset-password`, `/chat`, `/chat/$id`, `/a/$id`, `/settings/*`, `/templates`, `/explore`, `/status`) na 3 breakpointoch (360px, 768px, 1440px) a v Playwright screenshotoch identifikuj: nezarovnané padding, chýbajúce hover states, chýbajúce focus rings, príliš dlhé line-lengths (>75ch v proze), inconsistent border-radius (musí byť 8/12/16 iba, žiadne odchýlky), inconsistent shadow scale, farby mimo tokens. Vygeneruj `docs/visual-audit.md` s 30+ konkrétnymi issues.

2. **Motion system** — v `src/styles.css` definuj motion tokens: `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)`, `--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)`, `--dur-fast: 150ms`, `--dur-base: 220ms`, `--dur-slow: 400ms`. Všetky hover/focus transitions používajú tieto tokens. Modal open = `--ease-spring --dur-base`. Toast in = `slide-up --ease-out --dur-fast`. Chip select = subtle `scale(0.98) → 1` bounce. Reasoning shimmer respektuje `prefers-reduced-motion` (fallback: statická opacity 0.7). Pridaj `motion-safe:` prefix všade kde treba.

3. **Micro-interactions:**
   - **Composer send button**: send → morph do stop icon počas streamu → morph späť. 200ms.
   - **Copy button** (message actions, code block, share modal): click → checkmark tick s tiny bounce → auto revert 1.5s.
   - **Chip toggle**: selected → 1px accent border ring + subtle glow shadow. Click on selected → shrink + revert (feedback pre user, že vie deselect).
   - **Thread hover v ThreadList**: subtle bg tint + reveal `⋮` menu icon. Active thread: left accent bar 2px.
   - **Canvas file tab**: switching = smooth underline slide (Framer Motion `layoutId` alebo pure CSS ::after transition).
   - **Cursor v Monaco**: custom cursor blink smoother.
   - **Loading dots** v assistant typing: 3 dots wave animation (respektuje reduced-motion → static).

4. **Copy audit** — vygeneruj `docs/copy-guide.md` s tone-of-voice: **crisp, human, technical-but-friendly, sub-8 slov na CTA, nikdy „Please" ani „Sorry for the inconvenience"**. Prejdi VŠETKY user-facing strings a prepíš:
   - „Sign in with Google" (nie „Log in via Google account")
   - „Building your app…" (nie „Loading…")
   - „No threads yet — start one below" (nie „Empty state")
   - „Something broke. Not your fault. [Try again]" (nie „Error 500")
   - Rate-limit: „Slow down for a sec — cooling off in 12s" (nie „Too many requests")
   - Credits: „You've used 87% of today's credits. [Upgrade] or [Wait until midnight]"
   - Delete confirm: „Delete this thread? Its 24 messages go with it." (specifický count)
   Vytvor `src/lib/copy.ts` centralizovaný string catalog pre neskorší i18n.

5. **Empty & loading states** *(dopĺňa Krok N v master pláne)* — každá plocha má dedikovaný empty state s ilustráciou (SVG inline, tokens colored) + heading + subtext + CTA. Skeleton shimmer nahradí VŠETKY spinnery. Konkrétne skeletony: ThreadList (5 rows so mock timestamp + preview), MessageList (3 bubbles alternating widths), Canvas (grid + „Preparing sandbox…"), template grid (12 cards 200×280 s image placeholder), memory list (3 rows).

6. **Iconography konzistencia** — VÝHRADNE `lucide-react`, žiadne mixované sety, unified stroke-width `1.75`, size prop škála `14/16/18/20/24` (žiadne 15, 17). Icon buttons majú vždy `aria-label`. Vytvor `src/components/ui/icon-button.tsx` wrapper (`size`, `variant`, `tooltip` props) a nahraď VŠETKY raw `<button><X /></button>` inštancie.

7. **Typography rytm** — line-height `1.5` body, `1.25` headings, `1.7` prose. `text-balance` na všetky headings (`h1-h3`). Prose má max-width `65ch`. Mono font pre code, čísla v tabuľkách, timestamps v thread list, model názvy. Configure Tailwind v4 `@theme` s `--font-sans`, `--font-mono` cez CSS vars.

8. **Contrast & focus** — audit WCAG AA (text ≥ 4.5:1, UI ≥ 3:1). Focus ring: `outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`. Nikdy `outline: none` bez replacement. Skip-to-content link v `__root.tsx`.

9. **Hover reveals** — na desktop hover reveal secondary actions (napr. `⋮` menu na thread rows, delete na memory items). Na mobile vždy visible (žiaden hover event).

10. **Detail moments** — malé zážitky, ktoré prezradia care:
    - Konfety pri prvom vytvorenom artefakte (`canvas-confetti` lazy).
    - Custom 404 stránka s live search („Hľadal si toto?").
    - Meta description dynamically z artifact contentu na `/a/$id`.
    - Favicon changes ked new message príde v inactive tabe (badge s číslom).
    - Document title updates `(3) Builder — thread name` počas idle.
    - Custom text selection color (`::selection` s primary/20).
    - Scrollbar styled (subtle, matches theme).

**Deliverables:**
- `docs/visual-audit.md` (30+ issues + resolution status)
- `docs/copy-guide.md` (tone + string catalog)
- `src/lib/copy.ts`
- `src/components/ui/icon-button.tsx`
- Updated `src/styles.css` (motion tokens)
- Screenshots before/after v `docs/polish-diff/`

**Akceptačné kritériá:**
- Lighthouse Best Practices ≥ 95 na 5 hlavných routes.
- 0 raw spinnerov v shipnutom UI (grep `<Loader` alebo `animate-spin` bez pattern skeletonu).
- 0 hardcoded farieb (`grep -rE '(text|bg|border)-(white|black|gray|slate|zinc)' src/` = clean).
- Manual test: klikni cez celú app bez myši, každý focus je viditeľný.

---

## PROMPT 12 — Security Hardening (RLS · secrets · webhook · CSP · auth)

**Cieľ:** aplikácia prežije penetration test od nepriateľského juniora. Žiadny finding kritickej alebo vysokej severity.

**Rozsah:**

1. **RLS audit** — spusti `security--run_security_scan` a `security--get_table_schema`. Pre každú tabuľku overiť: RLS enabled, policies scoped na `auth.uid()`, GRANT statements match policies, žiadne `TO anon` na user-owned data. Konkrétne kontroly:
   - `threads`: SELECT/INSERT/UPDATE/DELETE iba `user_id = auth.uid()`.
   - `messages`: cez `EXISTS (SELECT 1 FROM threads WHERE id = thread_id AND user_id = auth.uid())`.
   - `artifacts`: rovnaká thread-owner logika + verejné SELECT policy iba pre `is_public = true` s narrow `SELECT (id, files, entry_path, ...)` column list — nikdy SELECT * pre anon.
   - `thread_memory` / `project_memory`: owner-only.
   - `agent_settings`: `user_id = auth.uid()`.
   - `user_roles`: SELECT `authenticated`, žiadne INSERT/UPDATE/DELETE pre normal users (iba service_role).
   - `usage_daily`, `events`, `metrics_*`: SELECT vlastných, INSERT cez service_role only.
   - `api_keys` (post-1.0): iba `user_id = auth.uid()`, hash column, plain len raz pri creation.

2. **Missing owner-read policies** *(edge case)* — akékoľvek stav-gated riadky (draft/pending/archived) potrebujú separátnu owner SELECT policy popri verejnej. Príklad artifactov: verejná policy filtruje `is_public = true`, owner potrebuje samostatnú `auth.uid() = user_id` policy inak vlastný draft nevidí.

3. **Secrets audit** — spusti `secrets--fetch_secrets`. Overit:
   - `LOVABLE_API_KEY` — server-only, nikdy VITE_.
   - `SUPABASE_SERVICE_ROLE_KEY` — server-only, importovaný iba cez `client.server.ts` inside handlerov s `await import(...)`.
   - Grep `src/` pre `VITE_.*(SECRET|SERVICE_ROLE|PRIVATE|API_KEY)` — zero results.
   - Grep pre hardcoded string patterns (`sk_`, `sb_secret_`, JWT format) v src/ — zero.
   - Overit že `.env` je gitignored (aj keď Lovable Cloud secrets nie sú v .env, obvyklá kontrola).

4. **Server function auth boundary** — každý `createServerFn` audit:
   - Ak číta/píše user-owned data → `.middleware([requireSupabaseAuth])`.
   - Ak vracia public read → server publishable client (nikdy `supabaseAdmin`).
   - Žiaden `createServerFn` bez auth middleware nesmie vracať PII alebo mutovať owner data.
   - Admin-role gated fns najprv volajú `context.supabase` na role check, potom dynamicky importujú `supabaseAdmin`. Nikdy naopak.

5. **Webhook & public API hardening** — pre každú `/api/public/*` route:
   - HMAC signature validation cez `timingSafeEqual` (Stripe, GitHub, custom).
   - Zod validácia body PRED dotknutím sa DB.
   - Rate limit per IP (in-memory Map v Worker s TTL 60s, alebo Supabase table `rate_limit_events`).
   - Žiadne PII v response.
   - Log unauthorized attempts do `security_events` table.

6. **Input validation všade** — každý formulár + každý server fn input má Zod schema:
   ```ts
   z.string().trim().min(1).max(10_000)  // messages
   z.string().email().max(255)             // email
   z.string().uuid()                       // IDs
   ```
   Nie textarea bez maxLength. Nie „unlimited" prompt (cap ~50k chars → prevent gateway abuse).

7. **XSS prevention** — grep `dangerouslySetInnerHTML` v src/ → each instance sanitizovaný cez `DOMPurify` (lazy import). Iframe preview už má `sandbox="allow-scripts"` bez `allow-same-origin` — potvrdiť. CSP meta v injektnutom HTML: `default-src 'self' 'unsafe-inline' data: blob:; connect-src 'none'` (blokuje sieť z artifactu — model si nemôže spraviť exfil).

8. **Response headers** — server middleware v `src/start.ts` (alebo `src/server.ts` wrapper) nastaví:
   - `X-Frame-Options: DENY` (okrem `/a/$id/embed` route ktorá potrebuje `frame-ancestors *`).
   - `X-Content-Type-Options: nosniff`.
   - `Referrer-Policy: strict-origin-when-cross-origin`.
   - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.
   - `Content-Security-Policy` (hlavná app): `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://ai.gateway.lovable.dev https://*.supabase.co wss://*.supabase.co`.
   - `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
   Verify na `securityheaders.com` → A alebo A+.

9. **Auth flow hardening:**
   - Zapni HIBP password check cez `supabase--configure_auth` (`password_hibp_enabled: true`) — blokuje leaked passwords.
   - Nastav `password_min_length: 10`.
   - Nastav `email_confirm: true` (nie auto-confirm) — prevent throwaway account abuse.
   - Session inactivity timeout: 7d (default OK).
   - Google OAuth `redirect_uri` = `${origin}/auth/callback` (verejná route), nikdy priamo do `/_authenticated`.
   - `/reset-password` route je verejná, akceptuje `type=recovery` hash, volá `supabase.auth.updateUser({ password })`. Bez tejto route sa recovery flow auto-logne.

10. **Delete-account flow** — GDPR-safe cascade: `/settings/account/delete` → confirm modal so type-to-confirm email → server fn s `requireSupabaseAuth` → verify caller matches user → volá `supabaseAdmin.auth.admin.deleteUser(userId)` po overení role. Cascade DELETE ON DELETE zabezpečí wipe všetkých vlastných riadkov.

11. **Iframe attack surface** — public `/a/$id` verejná route, ale artefakt beží v sandboxed iframe. Overiť že iframe nemôže escape → parent origin. `postMessage` bridge z console filtruje `event.origin` (nie `*`).

12. **Security memory update** — po fixnutí findings zavolaj `security--update_memory` s app-specific pravidlami (napr. „artifacts.is_public jediná verejná plocha, ostatné tabuľky owner-only", „všetky server fns musia mať auth middleware alebo byť explicitne public read cez publishable client").

**Deliverables:**
- `docs/security-checklist.md`
- Migračné SQL súbory pre chýbajúce policies
- Updated `src/server.ts` (headers)
- Zod schemas v `src/lib/schemas/`
- HIBP + email confirm nakonfigurované

**Akceptačné kritériá:**
- `security--run_security_scan` = 0 critical, 0 high.
- `securityheaders.com` A+.
- Manuálny test: hráč sa prihlási ako user A, skúsi `SELECT * FROM messages WHERE thread_id IN (thread user B)` cez Supabase Data API → error/empty.
- CSP nefailuje na žiadnej routes (browser console clean).

---

## PROMPT 13 — PWA & Mobile Install (installable + share target + push)

**Cieľ:** Builder je installable na iOS/Android/Desktop, správa sa ako natívna app, používatelia si ho pridajú na home screen, dostávajú notifications keď stream skončí.

*Postupuj podľa PWA skill-u — používaj `vite-plugin-pwa` s `generateSW`, guarded registration wrapper, nikdy neregistruj v Lovable preview.*

**Rozsah:**

1. **Manifest** (`public/manifest.webmanifest`):
   ```json
   {
     "name": "Builder — AI Studio",
     "short_name": "Builder",
     "description": "AI-first app studio",
     "start_url": "/chat",
     "id": "/",
     "scope": "/",
     "display": "standalone",
     "orientation": "any",
     "theme_color": "#0a0a0f",
     "background_color": "#0a0a0f",
     "categories": ["productivity", "developer"],
     "icons": [
       { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
       { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
       { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
     ],
     "screenshots": [
       { "src": "/screenshots/desktop.png", "sizes": "1920x1080", "type": "image/png", "form_factor": "wide" },
       { "src": "/screenshots/mobile.png", "sizes": "1080x1920", "type": "image/png", "form_factor": "narrow" }
     ],
     "share_target": {
       "action": "/chat/new",
       "method": "GET",
       "params": { "title": "title", "text": "text", "url": "url" }
     },
     "shortcuts": [
       { "name": "New thread", "url": "/chat/new", "icons": [{ "src": "/icons/new.png", "sizes": "96x96" }] },
       { "name": "Templates", "url": "/templates" }
     ]
   }
   ```

2. **Icons** — generuj cez `imagegen`:
   - `icon-192.png` (192×192, transparent bg, logo mark centered s 20% padding).
   - `icon-512.png` (512×512, rovnaký design).
   - `icon-maskable-512.png` (512×512, safe zone stred 40%, plná bg farba `#0a0a0f`).
   - `apple-touch-icon.png` (180×180).
   - `favicon.svg` (vector), `favicon.ico` (multi-size 16/32/48).
   - Otestuj cez `maskable.app/editor`.

3. **Head tags** v `__root.tsx`:
   ```
   { rel: "manifest", href: "/manifest.webmanifest" }
   { name: "theme-color", content: "#0a0a0f" }
   { rel: "apple-touch-icon", href: "/apple-touch-icon.png" }
   { name: "apple-mobile-web-app-capable", content: "yes" }
   { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" }
   { name: "apple-mobile-web-app-title", content: "Builder" }
   ```

4. **Service worker cez `vite-plugin-pwa`** (`registerType: "autoUpdate"`, `injectRegister: null`, `devOptions: { enabled: false }`, `workbox: { navigateFallback: "/", navigateFallbackDenylist: [/^\/api/, /^\/~oauth/] }`). Runtime caching:
   - HTML navigations: **NetworkFirst** (nikdy CacheFirst — inak stale UI).
   - Hashed built assets (`/_build/`, `/assets/`): CacheFirst, 30d.
   - Google Fonts CSS: StaleWhileRevalidate.
   - Font files: CacheFirst, 1r.
   - Images `/icons/*`, `/screenshots/*`: CacheFirst, 30d.
   - **Nikdy cache** `/api/*`, `/api/chat`, Supabase Auth, Storage signed URLs, streaming responses.

5. **Registration wrapper** (`src/lib/pwa-register.ts`) — jediný registrátor, refuse ak: `!import.meta.env.PROD`, inside iframe, hostname matches Lovable preview patterns, `?sw=off` query. V refused kontexte unregister existujúce matching SW.

6. **Update UX** — keď plugin detectne novú verziu, toast „New version available [Reload]" cez sonner. Update flow: click → `updateSW(true)` → reload.

7. **Offline shell** — cached shell zobrazí custom `/offline.html` fallback ak navigation zlyhá bez cache. Message: „You're offline. Your queued messages will send when you reconnect." + link na `/chat` (posledný cached thread).

8. **Offline queue** *(cross-ref s Prompt 07 M)* — messages napísané offline uložené v `idb-keyval`, drain hook v `useChat` po reconnect eventu. UI badge „3 messages queued".

9. **Share target** — Android share menu → Builder → nový thread s prefill z shared text/url. Route `/chat/new?title=X&text=Y` vytvorí thread, prefill Composer, focus.

10. **Push notifications** *(separátny messaging service worker — NIE app-shell SW)*:
    - `public/firebase-messaging-sw.js` alebo `public/onesignal-sw.js` (podľa providera).
    - User opt-in v `/settings/notifications`.
    - Trigger: stream skončí a tab is hidden/blurred → notification „Your artifact is ready".
    - Backend cez Supabase Edge Function alebo TanStack server route push do FCM/OneSignal.
    - Nezahŕňať do app-shell registration guard — nechať messaging worker mimo.

11. **Install prompt UX** — custom „Install app" tlačidlo v `/settings` a v menu (mobile). Načúva `beforeinstallprompt` event, stashne, na click volá `deferred.prompt()`. iOS Safari nemá event → ukáž „Add to Home Screen" instructions modal so screenshot.

12. **Kill switch** (pre budúce cleanup) — `?sw=off` → wrapper unregister všetky matching SW pre app scope. Zapamätaj v `docs/pwa-recovery.md`.

**Deliverables:**
- `public/manifest.webmanifest`
- Icons v `public/icons/`
- Screenshots v `public/screenshots/`
- `src/lib/pwa-register.ts` (guarded)
- `public/offline.html`
- Updated `__root.tsx` head
- Docs `docs/pwa.md`

**Akceptačné kritériá:**
- Chrome DevTools → Application → Manifest = zelené (no errors).
- Lighthouse PWA audit ≥ 90.
- Install prompt appears na Chrome desktop po 30s engagement.
- iOS Safari „Add to Home Screen" → launch → standalone bez browser chrome.
- Offline → navigate na cached route → shell renders bez white flash.
- **Preview safety verified**: SW never registers v `id-preview--*.lovable.app` (console log check).

---

## PROMPT 14 — Stack Audit & Dependency Discipline (kill dead code)

**Cieľ:** bundle je štíhly, každá dependency slúži účelu, žiadny mŕtvy kód, upgrade path je jasný. „Menej je viac" audit.

**Rozsah:**

1. **Dependency audit** — spusti `bun pm ls --all` a `bunx depcheck`. Vygeneruj `docs/deps-audit.md`:
   - **Unused** → remove (`bun remove`).
   - **Duplicate purpose** (napr. `date-fns` + `dayjs`, `axios` + native fetch, `lodash` + `es-toolkit`) → pick 1.
   - **Heavy alternatives** — nahradiť ak zbytočné:
     - `moment` → `date-fns` (tree-shakeable).
     - `lodash` → `es-toolkit` alebo native.
     - `uuid` → `crypto.randomUUID()`.
     - `axios` → `fetch` (Web standard).
   - **Missing prod deps v devDependencies** (alebo naopak) → fix categorization.
   - **Deprecated packages** (`npm outdated`) → upgrade plan.

2. **Bundle size analysis** — pridaj `rollup-plugin-visualizer` do vite config (behind `ANALYZE=true` env), spusti `ANALYZE=true bun run build`, otvor `dist/stats.html`. Identifikuj top 10 najväčších chunkov. Cieľ:
   - Initial JS ≤ 200KB gzipped (bez Monaco, ktorý je lazy).
   - Monaco chunk ≤ 800KB gzipped (lazy behind ClientOnly).
   - Žiadny chunk nespôsobí water-fall render blocking > 300ms na 4G.
   - Fonts subset (latin only ak neplánujeme non-lat).

3. **Code splitting audit** — každá route by mala lazy-loadovať heavy dependencies:
   - Monaco → `React.lazy` v Canvas, behind ClientOnly.
   - `qrcode` → lazy import v share modal.
   - `jszip` → lazy import v export handler.
   - `@vercel/og` → server-side only, dynamic import v `/api/og/*` route.
   - `mermaid`, `react-markdown` → lazy import v docs viewer.
   - `canvas-confetti` → lazy on first artifact success.

4. **Tree-shaking checks** — grep imports:
   - `import * as X from "..."` → convert to named imports.
   - `import { foo } from "lodash"` → `import foo from "lodash/foo"` alebo migrate na es-toolkit.
   - Radix + shadcn imports sú už OK (per-primitive packages).

5. **Icon subsetting** — `lucide-react` s tree-shaking OK ak per-icon imports. Grep `from "lucide-react"` → ensure named. Consider `unplugin-icons` ak > 100 rôznych icons.

6. **Framework version pins** — vytvor `docs/stack-versions.md`:
   ```
   Node/Bun: bun >= 1.2
   TanStack Start: 1.x
   TanStack Router: 1.x
   React: 19.x
   Tailwind: 4.x
   AI SDK: 6.x
   Supabase: 2.x
   ```
   Set `overrides` v `package.json` ak sub-deps forcujú staré verzie React (napr. niektoré ui knižnice).

7. **Renovate config** (`.github/renovate.json` alebo `renovate.json`):
   ```json
   {
     "extends": ["config:base"],
     "packageRules": [
       { "matchDepTypes": ["devDependencies"], "automerge": true },
       { "matchUpdateTypes": ["patch"], "automerge": true },
       { "matchPackagePatterns": ["^@ai-sdk/", "^ai$"], "groupName": "ai-sdk" },
       { "matchPackagePatterns": ["^@tanstack/"], "groupName": "tanstack" },
       { "matchPackagePatterns": ["^@radix-ui/"], "groupName": "radix" }
     ]
   }
   ```

8. **Dead code elimination:**
   - Spusti `bunx knip` — reportuje unused exports, files, deps, types.
   - Odstráň všetky.
   - Grep `TODO`, `FIXME`, `XXX`, `HACK` → resolve alebo tick-et.
   - Odstráň komentáre typu `// old code, keep for now`.
   - Odstráň `console.log` v prod build (Vite `esbuild.drop: ["console", "debugger"]` v prod).

9. **TypeScript strict pass** — audit `tsconfig.json`:
   ```json
   {
     "strict": true,
     "noUncheckedIndexedAccess": true,
     "noImplicitOverride": true,
     "noFallthroughCasesInSwitch": true,
     "exactOptionalPropertyTypes": true
   }
   ```
   Fix všetky nové errors (očakávaj 10-30 v average projekte).

10. **ESLint pravidlá** — pridaj `eslint-plugin-unused-imports`, `eslint-plugin-import` s `import/no-cycle`, `import/no-duplicates`. Fix všetky.

11. **CSS audit** — Tailwind v4 tree-shaking je automatické, ale kontroluj `styles.css`:
    - Žiadne unused `@utility` definitions.
    - Žiadne duplicate `@theme` values.
    - `@import` iba filesystem (rules per project constraints).

12. **License audit** — `bunx license-checker` → confirm all deps sú MIT/ISC/Apache-2.0 kompatibilné s tvojou licenciou. Flagni GPL/AGPL (usually forbidden pre closed source).

13. **Alternative stack contemplation** — zdokumentuj v `docs/adr/002-stack-review.md`:
    - „Prečo TanStack Start a nie Next.js 15?" → typed routing, embed friendly, TSS server routes majú menší cold-start než Next server actions v Cloudflare.
    - „Prečo Tailwind v4 a nie v3?" → Lightning CSS speed, native CSS variables, žiadny JS config.
    - „Prečo AI SDK a nie priame provider SDK?" → provider agnostic, `useChat` primitiva, tool calling built-in, streaming abstract.
    - „Prečo Supabase/Lovable Cloud a nie Prisma+Postgres?" → RLS, Auth, Realtime out-of-box, edge deployment.
    - Rozhodnutia na 6 mesiacov: „Zvažujeme migráciu na X ak Y." Ideálne nič.

**Deliverables:**
- `docs/deps-audit.md`
- `docs/stack-versions.md`
- `docs/adr/002-stack-review.md`
- `docs/bundle-analysis.md` (screenshots + numbers)
- `renovate.json`
- Updated `package.json` (removed deps)
- Updated `tsconfig.json` (stricter)
- Updated `eslint.config.js`

**Akceptačné kritériá:**
- `bunx knip` = 0 unused.
- `bunx depcheck` = 0 unused, 0 missing.
- Initial JS bundle ≤ 200KB gzip.
- `bun run build` finishes ≤ 45s cold, ≤ 15s warm.
- `bunx tsgo --noEmit` = 0 errors.
- `bun run lint` = 0 warnings.

---

## PROMPT 15 — Performance, Web Vitals & Launch Day (final gate)

**Cieľ:** Core Web Vitals green na 3G Slow mobile, LCP < 2.5s, INP < 200ms, CLS < 0.1. Zero-downtime deploy, monitoring live, rollback plan tested.

**Rozsah:**

1. **Web Vitals monitoring** — inštaluj `web-vitals` package, wire v `__root.tsx`:
   ```ts
   onCLS(sendToAnalytics); onLCP(sendToAnalytics); onINP(sendToAnalytics);
   onFCP(sendToAnalytics); onTTFB(sendToAnalytics);
   ```
   `sendToAnalytics` → `navigator.sendBeacon('/api/public/vitals', json)`. Server insert do `web_vitals(user_id, route, metric, value, rating, created_at)`.

2. **LCP optimization** — pre `/` landing:
   - Hero image preload (`<link rel="preload" as="image" href="...">`).
   - Above-fold text nie za lazy component.
   - Font `display: swap`, subset latin.
   - Consider CSS-only above-fold (žiadny JS-blocking render).
   - Cache hero as SSR (nie klientom fetched).

3. **INP optimization** — audit heavy handlers:
   - Composer send: nesmie block main thread > 50ms. Ak veľký prompt sanitizácia → `requestIdleCallback` alebo `scheduler.postTask`.
   - Monaco initial mount trvá ~600ms — schovaj za skeleton, mount cez `startTransition`.
   - Long lists (thread list 500+) → `@tanstack/react-virtual`.

4. **CLS prevention:**
   - Explicit width/height na VŠETKÝCH `<img>` a iframe.
   - Skeleton reserve exact space (nie „grow into").
   - Font-swap fallback matched metrics (`size-adjust` v `@font-face`).
   - Notifikačné bannery slide-down z fixed top position, nie push content.

5. **Route prefetching** — `<Link preload="intent">` na main nav (`/chat`, `/templates`, `/settings`). Prefetches on hover/touchstart.

6. **Image optimization** — všetky app images (nie user upload):
   - Format: AVIF preferred, WebP fallback, JPEG last.
   - Responsive: `srcset` s 1x/2x/3x variants.
   - Lazy loading (`loading="lazy"`) mimo above-fold.
   - Explicit dimensions.
   - Consider `@lovable/assets` CDN pre auto-optimization.

7. **Font strategy** — self-host Inter + JetBrains Mono cez `@fontsource/*`? Alebo Google Fonts s `preconnect`? Rozhodnutie: Google Fonts + `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` + subset `text=...` alebo `latin` only. Cache headers OK z Google side.

8. **API perf:**
   - `/api/chat` streaming (už je).
   - Ostatné server fns: response ≤ 500ms P95.
   - N+1 query audit — spusti prod-like scenario a inspecti Supabase query log. Fix N+1 s single JOIN alebo batched select-in.
   - Cache často-čítané tabuľky (templates list) v edge cache 5min.

9. **Cloudflare Worker cold start** — measure v `worker analytics`. TSS + nitro should be < 50ms. Ak väčšie, audit imports v `src/server.ts` (nič sync-heavy).

10. **Backup & disaster recovery:**
    - Confirm daily DB backup (Lovable Cloud auto).
    - Manual test restore do sandbox project.
    - Document restore procedure v `docs/dr.md`.
    - RTO cieľ: 1h. RPO cieľ: 24h.

11. **Deployment pipeline** — GitHub Actions alebo Lovable native:
    - PR → preview deploy on subdomain.
    - Merge main → auto deploy production.
    - Post-deploy smoke tests (Playwright hitting prod URL, 5 kritických flows).
    - Slack/email alert on failure.
    - Rollback: `lovable rollback` alebo git revert + redeploy < 5 min.

12. **Feature flags** — pre risky features (nová UI, experimentálny model), pridaj env-based flags:
    ```ts
    export const flags = {
      newCanvas: process.env.VITE_FLAG_NEW_CANVAS === "true",
      voiceMode: process.env.VITE_FLAG_VOICE === "true",
    };
    ```
    Turn off without redeploy → env var change + Worker restart.

13. **Alerting** — setup:
    - Uptime monitoring (UptimeRobot free) — ping `/` and `/api/health` every 5min.
    - Error rate alert: > 1% 5xx v 5min window → Slack.
    - Latency alert: P95 > 1s → warning; > 3s → critical.
    - Credit budget alert: 80% daily budget used → warning email.

14. **Load test** (light) — `bunx artillery quick --count 20 --num 10 https://staging.builder.app` pre kľúčové routes. Confirm no crashes at 200 concurrent users. Not full-scale load test — just smoke.

15. **Launch checklist** *(finalizuje Krok Z v master pláne)* — jeden markdown súbor `docs/launch-checklist.md` s 40+ položkami: DNS, SSL, custom domain, legal pages, contact email, status page, error monitoring, backup verified, rollback tested, first 100 users invited, announcement drafted (Twitter + LinkedIn + PH + HN), 3 demo videá, template gallery seeded, `/status` = green.

16. **Post-launch monitoring rutina** — prvé 72h dashboard tab open:
    - Sentry / error stream.
    - Web Vitals dashboard.
    - Supabase logs (slow queries).
    - AI Gateway usage graph.
    - User sign-ups graph.
    - Funnel: sign-up → first message → first artifact → share.
    - Top 5 tool errors.
    - Model latency P95 per model.

17. **Incident response** — dokumentuj v `docs/incidents.md` template: symptom, timeline, impact, root cause, resolution, follow-up. Prvý incident sa určite stane — mať template pripravený.

**Deliverables:**
- `docs/perf-baseline.md` (before/after metrics)
- `docs/launch-checklist.md`
- `docs/dr.md` (disaster recovery)
- `docs/incidents.md` (template)
- Web Vitals dashboard route `/settings/analytics/vitals` (admin-only)
- GitHub Actions workflow `.github/workflows/deploy.yml`
- Feature flags system v `src/lib/flags.ts`

**Akceptačné kritériá:**
- Lighthouse mobile: Performance ≥ 90, LCP ≤ 2.5s, CLS ≤ 0.1, INP ≤ 200ms.
- Bundle initial JS ≤ 200KB gzip.
- Worker cold start ≤ 50ms P95.
- `/status` route reflektuje real health checks.
- Rollback tested a docs kompletný.
- Launch checklist 100% ticknutý pred D-0.

---

## 🎯 Súhrn 15 promptov (kompletná mapa)

| # | Prompt | Fáza | Písmeno v A-Z |
|---|---|---|---|
| 01 | Agent Intelligence (tools + reasoning) | Foundation | I |
| 02 | Canvas Pro (Monaco + diff + versions) | Foundation | L |
| 03 | Chat UX (attachments + actions + suggestions) | Foundation | dopĺňa E |
| 04 | Command Palette + shortcuts | Foundation | K |
| 05 | Onboarding + Templates | Growth | O |
| 06 | Polish + SEO + a11y + boundaries | Polish | P + N |
| 07 | Resilience (fallback + retry + offline) | Reliability | M + R |
| 08 | Persistent Memory + RAG | Foundation | J |
| 09 | Sharing + Embed + Growth loop | Growth | S |
| 10 | Telemetry + Testing + CI | Ops | T + Q |
| **11** | **Final Polish Pass** | **Polish** | **P** |
| **12** | **Security Hardening** | **Ops** | **cross-cut** |
| **13** | **PWA & Mobile Install** | **Growth** | **cross-cut** |
| **14** | **Stack Audit & Deps** | **Ops** | **B** |
| **15** | **Performance & Launch** | **Ops** | **Z** |

Napíš `IDEM NA P11` (alebo iné číslo) a prepnem do build mode a spustím ten prompt. Odporúčaný poradie po dokončení P01-P10: **P14 → P12 → P11 → P13 → P15** (najprv upratať stack, potom security, potom lesk, potom install, potom launch).
