# Rental review safeguards

User-authorized fixes following the 11 October 2026 review. Based on `c29b549`;
local branch `fix/rental-review-safeguards`. No deployment, production mutation,
payment operation, Auth configuration or dependency audit is part of this change.

## Required document validity

The post-request uploader now requires a real expiration date covering the
quote's return time, using the same Daytona end-of-day convention as initial
draft submission. Invalid replacements leave existing bytes, review status and
release evidence untouched. A valid replacement still clears the appropriate
checks and requires resubmission/review. Resubmission, document review,
eligibility approval, agreement-field mapping and final confirmation each
recheck required document validity. Storage retention (`expires_at`) never
substitutes for document validity (`valid_until`). Missing legacy expiry must
be corrected; no dates are inferred or backfilled.

The existing quote-specific required-document policy is retained. No new
insurance coverage rules, OCR, identity verification or automatic approval were
introduced. The legacy guest/manual workflow remains subject to its existing
owner release checks; this fix does not create customer document identities for
unclaimed legacy requests.

## Cancellation

An authenticated owner can cancel pending or confirmed records with a current
revision and a customer-safe reason (5–500 trimmed characters). Cancellation is
terminal: it cannot be reversed into confirmed status. It releases this record's
internal hold/calendar occupancy while retaining its quoted terms and prior
review evidence. Independent calendar blocks remain. Reason, timestamp, acting
session and prior status are retained in the reservation and append-only audit;
customer/owner notifications are queued in the same transaction. Delivery is
not claimed merely because a message was queued. Existing notification rules
for unclaimed guest records remain unchanged.

The owner must explicitly confirm cancellation and inventory release. This is
not a refund, a returned-vehicle check, or a Turo update. The operator must
resolve possession/availability, external calendars and payment arrangements
separately before releasing inventory. The application has no completed-trip
state or owner-approved cancellation/refund schedule; no fee, refund amount,
deadline or automatic policy has been invented here. The action is available
for confirmed records regardless of their old pending-hold deadline.

Cancellation UI reuses existing panels and inputs. Empty/short reasons use form
validation; server validation remains authoritative. Dismissing confirmation
preserves the reason and performs no mutation. Existing global busy/error/status
handling preserves retryable input, rejects stale revisions and prevents duplicate
notifications/audit events after the terminal transition.

## Owner login throttling

The single `admin-login` bucket is no longer consulted. Limits are shared across
application instances through Postgres, but scoped to a signed anonymous browser
identifier (5 attempts / 15 minutes) and trusted network identity (100 attempts /
15 minutes). Both are enforced before expensive password verification. Rotating
or discarding browser cookies does not bypass the network ceiling. A successful
login clears only its browser counter; it does not clear the network allowance.
Old `admin-login` rows are inert. Expired new counters are cleaned on successful
login. Password comparison and eight-hour server sessions are unchanged.

The anonymous identifier is HMAC-signed using the existing private password hash;
it grants no access and creates no new credential. Its cookie is HttpOnly,
SameSite=Strict, Secure in production, `/api/admin` scoped, and expires after
15 minutes. Database bucket identifiers are HMACs; raw IP addresses are not stored.

On Vercel (`VERCEL=1`), only the validated, platform-provided
`x-vercel-forwarded-for` address is used. Ordinary `x-forwarded-for`, request body,
and caller-selected bucket identifiers are not trusted. Outside Vercel, only a
configured loopback origin and loopback request URL are supported: the approved
private SSH preview has one network ceiling and separate browser allowances.
That mode must stay loopback-bound; URL validation is not a firewall. Public
self-hosting without a trusted ingress adapter fails closed with 503 instead of
silently trusting a spoofable header. No hosting or network setting was changed.

Browsers sharing a network can still collectively exhaust the 100-attempt
ceiling. Distributed guessing and volumetric attacks require hosting-layer
controls; this change does not claim to solve them. The fixed window starts with
its first attempt and is not extended by later attempts. Thresholds are an
implementation choice for this low-volume owner endpoint, not a new business
policy or MFA substitute.

Hosting reference inspected 11 October 2026:
[Vercel request headers](https://vercel.com/docs/headers/request-headers#x-vercel-forwarded-for).
Vercel documents overwriting forwarded client IPs to prevent spoofing and its
platform-specific forwarded address. Do not use this trust assumption on another
host merely by accepting a similarly named client header.

## Verification entry points

- `npm run test:safeguards` is included in `npm test`: invalid-replacement
  atomicity; legacy expiry rejection at successive gates; valid correction;
  cancellation reason/revision/finality/inventory/audit/outbox; independent
  browser allowances, cookie rotation/network ceiling and trusted-ingress rules.
- `tests/browser/review-safeguards.spec.ts`: actual browser cookies, failed-client
  isolation, logout and unauthorized denial; expired replacement/correction;
  full owner approval; keyboard cancellation, dismissed-confirmation recovery,
  customer-visible status and 320/390/1440-pixel evidence.
- Existing portal/draft fixtures now supply explicit valid dates; existing
  synthetic cancellation fixtures supply a reason. No business assertions were
  removed. The hosted diagnostic cleanup script supplies the same required
  reason; it was not run against hosting.

The pre-existing owner API-client test at `tests/browser/owner-review.spec.ts:69`
is separate: Secure cookie transport over loopback HTTP previously yielded
52/53 in the portable harness while actual-browser supplemental checks passed.
Do not weaken cookies or silently call that baseline fully green. Final run
results are recorded in the task acceptance report outside this source checkout.
