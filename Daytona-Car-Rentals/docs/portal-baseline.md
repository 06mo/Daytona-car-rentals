# Baseline before renter portal changes

Inspected working tree at e2ef750610e1e08f48990afc0fea9dd5c28293e9, initially clean. New work is on feat/renter-portal-review; the separate presentation checkout is unchanged.

- POST /api/pilot/quote validates exact Origin before database access, computes authoritative prices, and stores expiring quotes. POST /api/pilot/requests uses the same origin guard, rate limits and createRequest. Request persistence, idempotency and inventory conflict checks share a checked-out Postgres transaction and advisory lock.
- Requests are pending, with a review hold of up to 24 hours. Demo replaces entered contact details with synthetic values. Owner password sessions protect /api/admin/state. Seven manual evidence checks and a fresh channel check gate confirmation; no payments or external screening are executed.
- /my-trip is a contact/reference placeholder. There is no customer authentication, ownership-aware lookup, document upload or customer portal.
- No application email sender, mail SDK, transactional outbox, Supabase Auth client or email notification path exists in app/, components/ or lib/. Submission explicitly says no automated email was sent. No delivery was tested or inferred from environment configuration.
- The owner sees persisted requests by refreshing the console. Audit rows contain time, action and reference, but no actor. Rates/settings have revision checks and quotes contain price snapshots; vehicle policy overrides are absent.
- Existing legal/release gates are manual prerequisites, not functioning Stripe, Checkr, agreement signing or insurance activation integrations.

No hosted records or credentials were inspected for this baseline.
