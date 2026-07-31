# Owner checklist — Stripe money path (T7 / T8 / T10)

**Agent cannot finish these alone.** Prod still returns **404** on Stripe routes until deploy + env + KYC.

## T7 — Deploy code with Stripe routes

1. PR `developeredit` → `main` on `youh4ck3dme/cosy-app-kit-new`
2. Wait for Vercel production deploy of `cosy-app-kit`
3. Accept:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" -X POST https://cosy-app-kit.vercel.app/api/stripe/checkout
# expect 401 or 503 — NOT 404

curl -sS -o /dev/null -w "%{http_code}\n" -X POST https://cosy-app-kit.vercel.app/api/stripe/webhook
# expect 400 or 503 — NOT 404
```

Also: `bun run prod-smoke` (asserts checkout ≠ 404).

## T8 — Vercel production env

Set on project (Production):

| Variable | Notes |
|----------|--------|
| `STRIPE_SECRET_KEY` | `sk_live_…` or test |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` from Stripe endpoint |
| `STRIPE_PRICE_PRO` | price id for CAI/COSY Pro |
| `APP_URL` | `https://cosy-app-kit.vercel.app` |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** — webhook persist + metering |

Never use `VITE_` / `NEXT_PUBLIC_` prefix for service role or Stripe secret.

## T9 — Apply DB migrations (same project `magqgwqyijuuaoovyjps`)

- `20260730220000_billing_subscriptions.sql`
- `20260731000000_stripe_events_idempotency.sql` (if present)
- `20260731120000_harden_dev_user_rls_no_anon_write.sql` (**T31**)
- `20260731121000_usage_counters.sql` (**T14**)

```bash
supabase link --project-ref magqgwqyijuuaoovyjps
supabase db push
```

## T10 — Stripe KYC

Dashboard → account `charges_enabled: true` before real charges.

## After live

1. Stripe CLI or Dashboard test checkout
2. Confirm row in `subscriptions`
3. Upgrade CTA shows live (billing.live=true)
4. Repair pass debit visible via `usage_counters`

---

*Related: docs/REPAIR_BACKLOG.md, docs/SECURITY.md (T31)*
