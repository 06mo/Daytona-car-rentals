# Coastal rental experience

Review branch: `feat/coastal-rental-experience`, based on coastal pilot `8cd54013ed701064a3c59b8c75d559a45dcabc2c`. The presentation worktree is separate and unchanged.

## Behavior

- Coastal identity retained. Homepage features the existing 2020 Corolla image, prominent Browse cars / Help me choose actions, optional dates, and short/weekly/monthly entry points.
- `lib/data/rentalChannels.ts` is the authoritative five-car direct eligibility rule. Inventory IDs, Santa Fe Sport trim, all 12 records and all existing Turo URLs are unchanged. Cards, filters, guided selection, request page, quotes, stored-quote submission and owner confirmation respect the rule. Turo-only cars cannot be enabled for direct requests in the console. Owner rate, launch and calendar gates still apply.
- `lib/data/journey.ts` and `JourneyProvider` carry vehicle, period, dates and pickup service through internal links and query parameters. Contact details are not part of that state. Compare SUVs changes the comparison, not the selected duration. Changing vehicle requires an explicit customer choice.
- Guided selection uses existing inventory features, not a live AI provider or live availability. Narrow comparisons stack vertically. Request pages retain the existing server-priced quote, idempotent pending submission and owner review flow. Unsent draft, submitted request and confirmation remain distinct. Preview receipts explicitly reserve no car.
- Maximum rental duration remains 30 civil rental days using the existing Eastern time/DST calculation. Period is optional quote/request metadata, not a discount or recurring contract. Renewal requires approval and availability. Date-validation errors now reach the customer as HTTP 400 messages; unrelated internal errors remain generic.
- Footer restores About, support and rental guides. Mobile Escape returns focus to the menu toggle; route navigation moves focus to the destination. Fleet category URLs still work. Owner calendar blocks, transactional conflict handling, quote snapshots/revisions and demo/live isolation remain intact.

## Focused UX refinement — 2026-10-07

Homepage rental-period chips synchronize with the period control. Its date panel has a Browse cars action, validates optional date pairs before navigation, and does not check availability. Fleet dates use a native expandable disclosure; guided recommendations precede optional dates. Rental preference, dates and pickup service survive car changes and browser Back.

The request form shows one selected-car summary and an expandable Change car selector. Changing trip fields invalidates both ready and in-flight quotes; stale responses are discarded. The quote hint follows current dates/loading state, and wizard Back restores heading focus. Server request safeguards and inventory records were not changed by this pass.

Validation: 14 core tests, 18 production Chromium browser tests, TypeScript and production build passed. Screenshots cover 1440×900, 390×844 and 320×844. Focus color remains White in both repository and recovered inventory records; apparent gray/silver photography requires owner confirmation before changing the record.

## Reproduce validation

Node 24+. Dependencies installed once using the unchanged lockfile.

```sh
npm test
npm run typecheck
npm run build
DCR_E2E_PRODUCTION=true CHROMIUM_BIN=/usr/bin/chromium \
  DAYTONA_EVIDENCE_DIR=/projects/daytona-handoff/coastal-experience/gallery/screenshots \
  npm run test:e2e
```

Browser tests start their own server on port 3000 with a temporary demo SQLite database and generated owner credential. They do not use production data. Omit `DCR_E2E_PRODUCTION` to use the development server. `CHROMIUM_BIN` is optional when a Playwright browser is already installed. Production admin tests use browser fetch to preserve Secure-cookie behavior on loopback; security settings are not relaxed.

## Storage and deployment decision

Keep one Node server instance with a persistent private disk and an absolute `DCR_DATABASE_PATH`. Protect the SQLite file and backups; do not serve its directory as static content. Separate live and demo databases are mandatory. The existing architecture is unchanged.

The decided production architecture is **Vercel + Supabase Postgres**. SQLite-to-Postgres migration remains pending and is separate work; the current SQLite implementation is not ready for Vercel serverless deployment. Stripe is the selected payment provider. Checkr Trust is the preferred screening candidate, pending commercial and onboarding confirmation. Neither integration is implemented in this pass. Backups, restore rehearsal, TLS, origin configuration, owner access hardening and launch dependencies remain in `PILOT-IMPLEMENTATION.md`.

No live rentals were enabled. No payments, insurance activation, MVR integration, signing, notifications, live AI, automatic renewal or Turo synchronization were added. Alternative acceptance is a required manual customer decision; there is no automatic substitution or customer acceptance portal. The selector does not establish vehicle availability or eligibility for a particular driver.
