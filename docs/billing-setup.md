# Billing setup before accepting payments

Paid subscriptions are unavailable until Stripe setup is complete. Free accounts and free courses can run while these settings are absent.

The backend returns `503` with code `BILLING_UNAVAILABLE` for unconfigured checkout, portal, and Connect onboarding requests. It checks configuration before creating a customer, payment session, or Connect account. The billing settings card preserves the stored subscription state and shows that paid subscriptions are unavailable. A failed subscription lookup shows a retry action.

## Required platform setup

1. Create and configure the Stripe account. Start in test mode.
2. Create the recurring prices that the platform will offer. Set the corresponding backend variables:
   - `STRIPE_PRICE_INDIVIDUAL_MONTHLY`
   - `STRIPE_PRICE_INDIVIDUAL_YEARLY`
   - `STRIPE_PRICE_TEAM_MONTHLY`
   - `STRIPE_PRICE_TEAM_YEARLY`
3. Set `STRIPE_SECRET_KEY` and the trusted application origin in `APP_URL`. Use an origin such as `https://app.graspful.ai`, without a path, query, or credentials. Production requires HTTPS. Checkout and portal returns always use this origin and `/settings`. Client return URLs cannot select another host.
4. Configure the Stripe customer portal for payment-method management and cancellation. Keep plan switching disabled until subscription update handling reconciles the configured price with the stored plan and member limit.
5. Register `POST /api/v1/webhooks/stripe` on the deployed API and set `STRIPE_WEBHOOK_SECRET` from that endpoint. Subscribe to `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, and `invoice.payment_failed`. Use the webhook API version that matches the installed Stripe SDK. The current installation uses Stripe v20 with API version `2026-02-25.clover`.
6. Verify test checkout, stored subscription status, billing dates, cancellation, payment failure, webhook retries, and portal return behavior against the deployed test setup. Then configure and repeat the required checks in live mode before offering paid subscriptions.

Configuration presence enables the corresponding controls. It does not prove that Stripe prices, the portal, or webhook delivery work. The settings upgrade action checks the individual monthly price. Other checkout requests require their own configured price.

## Academy payments through Connect

Creator payments require platform setup plus Stripe Connect configuration, account onboarding, and connected-account webhook delivery for `account.updated` and `invoice.paid`. A paid course cannot publish while platform billing configuration is absent or its academy onboarding is incomplete.

The existing learner checkout service has no API route or learner entitlement integration. Complete that purchase and entitlement flow, its UI, and its regression tests before selling academy access. Platform subscription checkout covers the organization plan; academy purchases need their own completed flow.

Connect links return to the existing settings route. The settings page does not yet provide the Connect onboarding controls or refresh-link recovery. Add that UI before asking creators to onboard without operator support.

## Local verification

```sh
cd backend
bun run test -- --runInBand billing
cd ../apps/web
bun run test -- src/__tests__/components/billing-settings.test.tsx
```

The tests mock Stripe and use the installed SDK's payload shape. Subscription periods come from `subscription.items.data`; failed-payment subscription references come from `invoice.parent.subscription_details`. Local tests do not create Stripe customers or validate a live Stripe account.
