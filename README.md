# Teknovashop Forge

Next.js storefront and configurator for generated STL designs. The app talks to the Render geometry backend, stores generated design metadata in Supabase, and gates downloads through Stripe-backed entitlements.

## Commands

```bash
npm install
npm test
npm run typecheck
npm run build
npm run lint
```

Run the production readiness check only with real environment variables loaded:

```bash
npm run check:readiness
```

The readiness script is read-only. It verifies required env vars, Render `/health`, Supabase commerce tables, the STL storage bucket, Stripe prices, and the Stripe webhook endpoint.

## Production Setup

1. Deploy the Render backend and verify `/health`.
2. Apply `supabase/migrations/20260923_commerce_foundation.sql`.
3. Create the `forge-stl` bucket or set `NEXT_PUBLIC_SUPABASE_BUCKET`; keep it private in production.
4. Set all Vercel variables from `.env.example`.
5. Fill the legal identity variables. Checkout remains blocked until legal config is complete.
6. Configure Stripe prices: `oneoff` as one-time payment, `maker` and `commercial` as recurring subscriptions.
7. Configure Stripe webhook at `/api/checkout/webhook`.
8. Run `npm run check:readiness` with production env.
9. Run a Stripe test-mode checkout end to end before switching to live mode.

## Stripe Events

Listen for:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`
- `charge.refunded`

The legacy `/api/stripe/webhook` path reuses the same handler, but new Stripe configuration should point to `/api/checkout/webhook`.

## Notes

Downloads are served only after auth and entitlement checks, and the app verifies stored STL hashes against manifests before building the ZIP. STL files are still delivered to licensed buyers; treat them as downloadable digital goods, not DRM-protected assets.