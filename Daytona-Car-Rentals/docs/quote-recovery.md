# Request quote recovery

Review keeps trip details, driver information and document statuses visible when
there is no current quote. Refresh quote uses the saved draft's exact vehicle,
dates, pickup service and period. It never submits a request. A fresh or restored
quote always requires explicit acceptance before Submit request is enabled.

## Diagnosed behavior

Normal intake saving and uploads did not invalidate a still-valid quote in the
reproduced baseline. Same-trip browser history did: the old popstate handler
unconditionally cleared it. Quotes also lived only in React state, so reload,
Auth return and Save draft/resume lost them before server expiry. The original
Review view turned those cases into a return-to-Choose dead end. This is a local
reproduction of the reported symptom, not proof of the original phone session's
specific event.

The wizard now preserves a matching in-memory quote on same-trip history. It
stores only the quote ID and trip fingerprint in session storage, never a price,
acceptance, identity, document or credential. Reload restores that reference by
asking the server for its stored quote. The server checks the same expiry,
configuration revisions, launch gates and calendar availability as submission.
It does not extend expiry. An invalid old quote may be returned only as previous
price evidence; it cannot enable submission. A new device or cleared storage
can always refresh in Review without repeating intake or uploads.

Real expiry clears acceptance and exposes Refresh quote in place. Changed trip
inputs invalidate the quote immediately. Request-version and complete-trip
comparisons ignore late responses. Refresh failures and unavailable vehicles
retain the draft and offer retry or Edit trip. Refreshed price/deposit breakdown
and policy changes are compared with the last server-sourced quote when present.
Without a previous quote reference there is no invented comparison.

Final submission still runs the existing owned-draft, revision, required-intake,
document, quote, conflict and idempotency checks in the existing transaction.
Repeated final submissions return the same request. The confirmation says
“Request submitted — awaiting approval” and links to My trips.

## UI states and local verification

Choose, Driver & docs and Review remain the same three steps. Save draft,
Continue to review and Submit request have separate meanings. The measured
sticky-header height offsets step focus and keyboard controls, including text
resizing; the mobile stepper reflows. Coastal tokens, document limits and native
image picker remain unchanged. No database migration or environment change.

Focused backend: `node --conditions=react-server --import tsx tests/quote-recovery.test.ts`.
Browser: `CHROMIUM_BIN=/usr/bin/chromium npx playwright test --config=playwright.recovery.config.ts`.
Both use the existing isolated loopback Postgres/Auth fixtures; never run these
fixtures against hosted data. Evidence and final counts are in
`/projects/daytona-handoff/quote-recovery/handoff.md` with a local screenshot
gallery. Linux WebKit is not physical iPhone/Safari verification. No email,
hosted data or deployed configuration is involved.
