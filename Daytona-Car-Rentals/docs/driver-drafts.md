# Driver and document drafts (migration 005)

Booking step 2 is **Driver & documents**. Contact details, manual renter intake and private image uploads share the same components and image/intake validation as My trips. Step 3 reviews the saved version together with the authoritative quote. Uploaded is not reviewed, email authentication is not driver verification, and a request is not a confirmed reservation.

## Customer journey

1. Browse publicly and choose the trip/quote. Sign in when entering step 2; the existing exact-origin magic-link intent preserves vehicle, dates, period, pickup, step and draft ID. Auth credentials and hook configuration are unchanged.
2. The authenticated customer owns a Postgres draft. Fields autosave with a visible saved/error state. Save and finish later explicitly awaits persistence and opens My trips. No reservation, hold, or request notification exists at this stage. In-flight edits require a successful save; wait for the saved status before closing the browser.
3. Upload a license/insurance JPEG or PNG using file or phone-camera selection. The shared uploader shows transfer/processing state, supports retry/replacement, and preserves previously saved images on failed uploads. Draft images can be removed. No document bytes or contact/intake fields are stored in browser storage. The URL carries only trip choices and an opaque, ownership-checked draft ID.
4. Returning customers receive saved contact/intake fields but must reconfirm them. Eligible, unexpired retained request documents may be explicitly copied to a new draft. Approval does not transfer. Legacy documents without validity metadata remain accessible to their owner but cannot be reused until replaced with a dated upload. Owner review must establish that renter-entered validity information is accurate.
5. Review and accept the current server quote. Submission atomically validates ownership/revision, contact, confirmed intake, age, license expiry, configured required documents valid through return, and full trip/quote consistency. The existing transaction, channel/launch gates, quote expiry, 30-day limit, conflicts, idempotency and notification outbox remain authoritative. The draft UUID is the final submission idempotency key. Changed pricing requires a fresh accepted quote; documents are retained.
6. My trips shows saved drafts, request status and existing corrections/document-update controls. Newly submitted complete requests enter under review; the extra send-for-review action appears only when information needs submitting again. Monthly renewals remain separately approved terms of up to 30 days.

## Persistence, security and retention

`005_customer_drafts.sql` adds `customer_drafts`, immutable `draft_documents` versions, and nullable `documents.valid_until`. Existing requests, quotes and documents are not rewritten or backfilled. Ownership is checked server-side against the verified Supabase user on every draft/file operation. Writes also require the expected account ID and exact request origin. Revision checks prevent stale field/upload overwrites; final duplicate submission returns the original request. Public database roles receive no access; forced RLS and the existing restricted server role apply to new tables.

The existing private Postgres bytea architecture remains. Input images are limited to 2 MB/16 megapixels, decoded and stripped of metadata. At most five active drafts/customer and twenty upload versions/draft are permitted. Unsubmitted drafts expire **30 days from creation**, without sliding extension; downloads/reuse fail after expiry. Explicit draft removal deletes all versions of that document kind. Successful submission freezes the original draft intake/document versions, and creates separate request copies with owner approval false. Later request corrections do not mutate the original submission snapshot. Draft originals and request copies expire 30 days after the requested return. They are historical intake records, not executed agreements.

The existing authenticated retention action/maintenance job deletes expired drafts, cascading all image versions. Physical cleanup requires a running schedule. Backup copies persist according to the separately controlled backup lifecycle; active deletion cannot erase them. The upper document-byte bound is 40 MB/draft before Postgres/WAL/backup overhead, plus up to 4 MB of current request copies on submission. Common two-image requests are much smaller; do not interpret these limits as approval to collect real identity documents in Preview. No private Storage migration, OCR, external screening, payment or email integration was added.

## Deployment requirement — not performed in this change

Production architecture remains Vercel + Supabase Postgres; local verification uses disposable loopback Postgres. Before any separately authorized Preview rollout:

1. Preserve and verify a private recoverable backup using `docs/postgres-backend.md`. Verify the dedicated Daytona synthetic project/demo identity and the committed checksums for migrations 001–004.
2. Using the existing private migration-owner configuration and verified TLS, run `npm run db:migrate` only when **005 is the sole missing migration**. Do not use runtime credentials, reseed, reset, or expose credentials. This task did not apply hosted migrations.
3. Verify ledger checksum 005, forced RLS, public-role denial and restricted runtime DML on both new tables. Re-grant the documented backup reader SELECT on the new tables; do not grant runtime DDL/BYPASSRLS. Existing INSERT-format private-schema dumps include the new tables. The local backup regression restores populated drafts and historical image versions using the existing non-superuser role arrangement.
4. No new environment variables, Auth URLs, callbacks or hook secrets are needed. Preserve the working hosted magic-link configuration, exact branch origins, approved-recipient restrictions, demo mode, captured rental notifications and Vercel protection.
5. Verify the existing maintenance schedule actually invokes the authenticated purge; no schedule was provisioned here. Hosted small synthetic uploads, physical camera selection, Vercel payload behavior and hosted Auth resume still need an authorized Preview check.

Recovery: this is an additive schema change. Keep migration 005 and records intact if rolling application code back to the preceding checkpoint. Do not drop draft tables to roll back a UI deployment. If restoring a backup, restore into an isolated database from its matching migration manifest, then apply reviewed forward migrations before switching writers. Preserve Auth user IDs and never restore Preview identity/document data into production.

## Local regression entry points

`npm run test:drafts`, `npm test`, `npm run test:portal`, `npm run test:auth-hook`, `npm run typecheck`, `npm run build`, and `npm run test:e2e` with the existing loopback-only test credentials. Browser cases use isolated synthetic fixture identities to avoid sharing customer quotas; hosted fixture rejection is unchanged. Screenshots and run evidence live outside Git in `/projects/daytona-handoff/driver-drafts`.

### Validation recorded for this implementation

70 backend checks passed (29 core/Postgres/backup/origin, 25 portal/outbox/Auth isolation, 11 signing hook, 5 draft scenarios), plus TypeScript and the production build. The full 35-case browser suite passed; after final My trips account-switch hardening, the 13 affected cases passed (12 together, the callback case rerun after using browser fetch for Secure loopback cookies). This covers a delayed previous-account response, magic-link return to an owned step-2 draft, explicit document reuse, keyboard operation, 320/390/1440px layouts, retry state, quote refresh, history and duplicate final submissions. All database records/images were synthetic and local. No hosted delivery, camera hardware, migration or deployment is claimed by these results.
