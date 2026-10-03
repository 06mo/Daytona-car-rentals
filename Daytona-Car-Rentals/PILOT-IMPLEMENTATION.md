# Approved custom pilot

Approved October 3, 2026: coastal identity; Choose / Verify / Review; custom backend; reviewed direct-rental requests; manual reconciliation with Turo. HQ and Rent Centric are not dependencies.

## What works

- Responsive coastal homepage, real existing fleet assets, fleet/detail pages, and local landing pages.
- Three-screen request flow with a stored, server-priced 15-minute quote, separate deposit, contact validation, and explicit pending status.
- Persistent custom SQLite reservation ledger. Transactional holds prevent overlapping direct requests; temporary holds expire after 24 hours or at pickup, whichever comes first.
- Turnaround buffers, calendar blocks for external trips/maintenance, effective quote invalidation on configuration changes, accepted-price snapshots, and idempotent submission.
- Password-authenticated owner console: daily queue, review checklist, fleet eligibility/rates, blocks, operating settings, audit history, and sign-out/session expiry.
- Server-enforced checks for license, MVR, qualifying insurance, signed agreement, payment evidence, trip protection and shared-channel availability. Channel review must be within 15 minutes of confirmation.
- Production mode starts closed, with zero/unset rates and unapproved launch requirements. Demo and live databases cannot be interchanged.
- Preview discards entered contact details and stores a synthetic renter. Preview prices, mileage and age are explicitly examples.
- Guided car selector on the homepage. It is deterministic, not a connected AI agent.
- Editable brand SVG masters and PDF letterhead/business-card concepts; Florida agreement review template.

## Start a local review

Requires Node 24+ and npm. From this directory:

```sh
npm ci
npm run admin:setup
npm run dev
```

The setup command prompts for a hidden password and writes ignored local configuration. A new setup starts in preview mode. Open `/`, `/booking`, and `/admin`. Use fictitious contact details. No card is charged and no protection is activated.

```sh
npm test
npm run typecheck
npm run build
PLAYWRIGHT_BROWSERS_PATH=/tmp/daytona-browsers npx playwright install chromium
PLAYWRIGHT_BROWSERS_PATH=/tmp/daytona-browsers npm run test:e2e
```

Browser tests create an isolated temporary database and a randomly generated test admin credential. They never use the production database. Ensure port 3000 is available.

## Hosting architecture

This is a custom Next.js Node server with built-in SQLite, not a static export and not a Firebase application. Run one application instance against a persistent private disk/volume. Set `DCR_DATABASE_PATH` to an absolute private path. Do not deploy the SQLite file into an ephemeral serverless filesystem or run separate instances with separate copies.

For a small, staffed pilot, SQLite transactions serialize allocations safely. Before multiple application instances or larger-scale operation, move the store adapter to PostgreSQL with database-enforced allocation constraints. Hosting/storage, backups and support still have costs even without rental SaaS subscriptions.

The owner console uses salted scrypt credentials and opaque database-backed cookies (HttpOnly, SameSite Strict, Secure in production). Mutating endpoints enforce origin and payload limits. Login attempts are rate-limited. Public quote/request limits are currently application-wide; add edge-level limits and bot protection before accepting public traffic.

Before live traffic: HTTPS; explicitly configured `DCR_SITE_ORIGIN`; external MFA/access control for the owner console or a full identity provider; encrypted disk and backups; restore rehearsal; a retention/deletion process; monitoring; and deployment-specific security review. A password-only preview is not a complete production identity system.

## Pending launch dependencies

1. Actual ABI/INSHUR Period Z policy and endorsements; direct-rental business/vehicle/driver eligibility and activation workflow confirmed in writing. The config checkbox records operator review; it does not validate coverage.
2. Florida counsel-approved agreement, renter-primary wording on its face, e-signature process and document retention.
3. MVR vendor approval for consumer rental use, provider-specific consent/dispute process, insured eligibility thresholds and report freshness. A manual secure provider portal is the intended first adapter; the console records references, not reports.
4. Secure identity/insurance/document collection. No document uploads or raw license/policy numbers are collected by this implementation.
5. Payment provider, deposit timing, refund/cancellation policies and reconciliation. The console records manual payment evidence; it does not process charges, capture holds or refunds.
6. Confirmed fleet, rates, mileage, minimum age, taxable fees and tax/surcharge rules. Current quoted calculations assume rental/surcharge/delivery share one tax rate; the accountant must approve that model or it must be extended before launch.
7. DAB permission, parking/meeting rules, delivery buffers, hours and flight-delay arrangements. Airport delivery starts disabled in live mode.
8. Notification provider. The request receipt tells the customer to contact the team; no automatic emails/SMS are sent.
9. Customer portal authentication. `/my-trip` provides staffed support, not self-service private trip access. Extensions, cancellation/refunds, pickup inspections and on-rent/returned states are subsequent operational work.
10. Broader assistant tools. Natural-language booking, grounded policy answers and authenticated actions need a separately configured model/provider and validated policy knowledge.

Do not simply enable `requestsEnabled` to bypass these dependencies. Use a new live database and verified rate/eligibility records; keep the demo database separate. Settings require policy/agreement/tax references, age and mileage before enabling requests. They document your review rather than independently establish compliance.

## Staff workflow

Record existing Turo trips as direct-calendar blocks. When a direct request arrives, check driver eligibility and arrange the approved external verification process. Record actual evidence references for each required check. Immediately before confirmation, check the current Turo calendar and block the car there. Record the cross-channel evidence, then confirm within 15 minutes. The app repeats its direct-calendar conflict check in the confirmation transaction.

There is no automatic Turo synchronization. A direct database transaction cannot prevent a simultaneous Turo booking. Use exclusively allocated cars/time windows if manual reconciliation cannot meet operational requirements. Calendar blocks and cancellation actions do not change external platform reservations or process refunds.

## Review and deployment

Changes are on `feat/coastal-direct-rental-pilot`. Nothing has been pushed or deployed. Preserve the live Turo site until the complete pilot is approved for launch. Historical files under `ai/` describe earlier planned Firebase features; they are not evidence of implemented capabilities. This document, current source and tests describe the new custom pilot.
