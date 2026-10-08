# Independent review fixes — local only

Applies after `dc71a6e` on `feat/renter-portal-review`. No hosted migration/configuration or mail delivery was performed.

## Auth isolation

With `VERCEL` present or `VERCEL_ENV=preview|production`, Auth rejects test mode, fixture/non-project hosts, test keys, non-HTTPS endpoints, nonstandard ports, URL credentials/path/query/fragment, TLS verification disabling and the fixture DNS hook. Fixture startup, E2E startup and DNS hooks also refuse hosted markers. Local production-build tests retain their temporary CA and loopback fixture outside hosted modes. No TLS verification is disabled. Tests exercise both hosted modes with diagnostic DNS/CA configuration as well as normal hosted URL validation (without contacting Supabase).

## Durable delivery claims

Apply new migration `004_outbox_claims.sql` with the migration owner before running this version. Migration 003 remains required; do not edit checksums, reseed or reset existing data. Runtime permissions and forced RLS remain unchanged. New columns: claim_token, lease_until, delivery; delivery holds exact serialized provider JSON, not JSONB, so retries are byte-identical despite sender configuration changes.

A short shared-lock transaction claims at most five events with a random token and a 60-second lease. External calls happen outside every rental transaction. Before sending each event, the worker conditionally renews its own unexpired claim. After sending, a short transaction records an outcome only for that claim token. Provider calls time out after three seconds. Failed/uncertain calls retain a retry with exponential backoff. A crash before sending or after acceptance leaves a recoverable lease; a replacement worker uses the same event UUID as provider idempotency key and the stored body. A superseded worker cannot overwrite a replacement's outcome. Batch capture remains forced in demo/Preview even if sending credentials are present.

Exactly-once delivery is not claimed. A provider acceptance followed by a process/database failure creates an uncertain interval until replay/reconciliation. Lease expiration during process suspension can result in overlapping provider calls, deduplicated only by the provider contract. Resend retains keys for 24 hours; this application blocks automatic replay once an event is 23 hours old (conservatively measured from creation, including never-attempted events). Account/provider changes, manual key resets, historical restores or a provider violating its contract can still duplicate delivery. Never replay blocked rows or regenerate keys blindly. Reconcile against provider history first. The old cutoff/reconciliation limitation remains, and delivery/bounce webhooks are not implemented. Reference: https://resend.com/changelog/idempotency-keys

Do not roll back to the old worker while claims are active. Pause schedulers/owner dispatch, allow in-flight sends to settle, preserve leases and frozen bodies, and reconcile uncertain events before changing worker versions. Prefer a forward fix. Recovery restores into capture mode first. Schema-wide backups include claims and exact delivery bodies; tests verify these survive separate-role dump/restore.

## Agreement field generation

The generation operation now requires reviewed intake, approval, an active pending hold or confirmed reservation, and current reviewed required documents. Cancellation/decline/expiry and stale review states are rejected even if approval flags persist. A confirmed reservation is not treated as expired merely because its former pending hold elapsed.

This endpoint generates current fields; it is not retrieval of an executed agreement. Inspection found no stored executed agreement, signing integration or historical-agreement download operation to preserve. No existing artifact is deleted or altered. Future executed-agreement access must be a separate ownership-checked immutable artifact retrieval operation, independent of eligibility for generating a new agreement. Do not use this endpoint to reconstruct a purported signed agreement from mutable fields.

## Exact Preview mail restrictions and setup

Scope Vercel Preview variables to `feat/renter-portal-review`, leaving Production unchanged:

- `DCR_DEMO_MODE=true`
- `DCR_EMAIL_MODE=capture`
- `DCR_AUTH_TEST_EMAILS`: comma-separated exact addresses explicitly approved by the owner; do not substitute a whole domain. Empty denies all application sign-in sends.
- `DCR_SUPABASE_AUTH_URL=https://moxcovrhondqpjykslkh.supabase.co`
- `DCR_SUPABASE_PROJECT_REF=moxcovrhondqpjykslkh`
- `DCR_SUPABASE_PUBLISHABLE_KEY`: matching Daytona publishable key entered privately.
- `DCR_SITE_ORIGIN` and `NEXT_PUBLIC_APP_URL`: actual authorized HTTPS branch origin, obtained after separately approved protected bootstrap; never guess or use Production.
- Retain restricted `DCR_DATABASE_URL`, verified `DCR_DATABASE_CA`, `DCR_ADMIN_PASSWORD_HASH` and private `DCR_MAINTENANCE_TOKEN`.

Leave `DCR_EMAIL_API_KEY` and `DCR_EMAIL_FROM` unset for Preview. `DCR_OWNER_EMAIL` may be a synthetic capture destination. All transactional emails are captured, including messages to approved recipients: there is no Preview switch to send a subset. This is a stronger application restriction than a recipient allowlist and is locally tested. No transactional provider-side allowlist has been configured or verified. Any future real transactional test-delivery mode requires separate authorization, an application recipient gate and verified provider recipient restrictions; setting `DCR_AUTH_TEST_EMAILS` does not restrict Resend.

Auth application allowlisting applies only to this app's sendLink endpoint. It does not constrain direct Supabase Auth requests. For a provider-enforced restriction, the Daytona Auth sender must use an SMTP test sandbox/relay that rejects every recipient outside the same approved address set, OR a separately implemented and verified Supabase Send Email Hook that checks exact recipients before calling its provider and fails closed. Neither arrangement has been provisioned or verified here. There is no existing project-wide Supabase environment variable in this app that creates that restriction. Do not claim the application allowlist secures the provider endpoint. Supabase's default sender restricts addresses to project-team members, not necessarily the operator-approved list.

Operator SMTP settings (private in the Daytona Supabase dashboard): sender email/name; provider-supplied host, port, username and password; verified SPF/DKIM/DMARC records from that provider; approved-recipient restriction at the provider. Exact provider values cannot be supplied until an existing approved sender/sandbox is identified. If choosing a Send Email Hook instead, configure its separately reviewed HTTPS endpoint and signing secret in Auth Hooks, with recipient enforcement in the hook; this is not implemented by these fixes. See official SMTP and hook guidance:
https://supabase.com/docs/guides/auth/auth-smtp
https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook

Retain email confirmation, actual-origin `/auth/confirm` redirect allowlisting and Magic Link/Confirm Signup template `{{ .RedirectTo }}&token_hash={{ .TokenHash }}` (app supplies `?intent=...`). Check first-time/returning users, expired/reused links, refresh/logout and callback preservation through Standard Protection only after separately authorized hosted setup. Do not enable fixture variables, test NODE_ENV, diagnostic DNS hooks or TLS-disable settings in Vercel.

Maintenance remains an authenticated POST with `Authorization: Bearer <DCR_MAINTENANCE_TOKEN>`; a protected Preview scheduler also needs approved Vercel automation access. No schedule is installed. Continue synthetic records, no production/MTS access, no live rentals.


## Local validation

- `npm test`: 29/29, including real Postgres concurrency and separate-role backup/restore of the new lease/body fields.
- `npm run test:portal`: 24/24 (15 portal, 7 outbox, 2 Auth-isolation tests).
- Slow five-message reproduction: five 2.5-second provider stubs, rental settings transaction 8 ms; competing worker processed none of the claimed events.
- Crash-before-send, provider-accepted/DB-acknowledgment-failed recovery, superseded-worker fencing, timeout retries, identical frozen payloads, and Preview capture with sending credentials all pass. Provider delivery is stubbed, not real.
- Focused production-build Playwright: 13/13 covering sign-in, reused/expired links, logout, cross-account drafts, owner access, request submission, delayed quote inputs, history and focus at 390/320px.
- `npx tsc --noEmit --incremental false` and `npm run build`: pass. A browser attempt overlapped an earlier build and had a timeout; a fresh post-build run passed all 13. Earlier JSONB retry ordering and TypeScript errors were fixed before final validation.

Logs: `/projects/daytona-handoff/renter-portal-independent-review/fixes-*.log`. No hosted/provider validation is implied. Hosted prerequisites remain migrations 003/004, branch-scoped configuration, actual-origin Auth redirects/templates, approved-recipient provider enforcement, protected maintenance scheduling, runtime TLS/pool/RLS and backup verification. Keep local Postgres for development and daytona-rentals-dev exclusively for synthetic hosted Preview.
