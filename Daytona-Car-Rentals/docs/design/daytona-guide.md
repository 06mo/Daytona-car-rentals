# Daytona design guide

Source baseline: `59207bc006fc6fd1a685920d5f5281aaaa15c639`, inspected 2026-10-10.
Paths below are relative to `Daytona-Car-Rentals/`. This documents the existing
implementation; it does not introduce new tokens or authorize a redesign.

## Owner-approved direction

These decisions come from the owner's coastal, renter-intake and document-card
requests, corroborated by the handoffs listed below. Preserve them in future work.

- Keep the cream/sand, navy and teal coastal identity, existing brand mark,
  typography direction and verified fleet photography. Serve local renters and
  visitors; give weekly/monthly transport prominence. Monthly terms are up to
  30 days; a new term requires approval and availability, not automatic renewal.
- Make Browse cars and Help me choose obvious. Optional dates must not prevent
  browsing. Guided selection is not live AI. Keep mobile comparisons readable.
- Distinguish Direct rental requests from Book on Turo. Five direct-eligible
  records remain Corolla `corolla-3275798`, Santa Fe Sport `santafe-3143340`,
  EcoSport `ecosport-3580557`, Elantra `elantra-3321200`, Focus `focus-3139374`.
  The other seven keep their original Turo routes. Eligibility never bypasses
  owner-controlled launch/availability gates. See `lib/data/rentalChannels.ts`
  and `lib/data/vehicles.ts`; do not duplicate the mapping in UI code.
- Step 2 collects driver details and private documents. Separate license and
  insurance cards use one standard image picker without forced camera capture.
  Prefer the native picker’s existing camera/library choices over redundant
  custom controls. Show Upload image when empty and Replace image when selected
  or saved; Save image persists a selection. Saved expiration metadata is labeled
  text, not an editable-looking field.
  Insurance is marked required only by existing rules. Keep explicit reuse.
- Selected is not uploaded; uploaded is not reviewed; reviewed documents are
  not final rental approval. A saved draft creates no booking/hold/notification.
  A submitted request is not a confirmed rental. Never invent pricing, coverage,
  payment, live availability, identity verification or successful delivery.
- Preserve saved work through navigation, sign-in, upload failures and refreshed
  quotes. My trips supports drafts, status and corrections. An alternative needs
  explicit customer acceptance. Use plain language and a clear next action.

## Existing visual implementation (observed, not new design policy)

| Area | Actual source and values |
| --- | --- |
| Core palette | `app/globals.css` coastal `:root`: `--navy #122b3d`, `--teal #087f82`, `--sand #f7f5ef`, `--sun #f2a65a`, `--ink-muted #506573`, `--line #dce3e0`. Earlier generic RGB variables also remain; do not mistake them for the coastal palette. |
| Tailwind brand aliases | `tailwind.config.ts`: brand `#122B3D`, accent `#087F82`, surface `#F7F5EF`. Reuse these or the CSS variables in their existing context. |
| Typography | System sans; `app/layout.tsx` applies Tailwind `font-sans`. `app/globals.css` also declares a Segoe UI/system stack on body; inspect computed styles because the utility class has higher specificity. No new web font is needed. h1/h2/h3 use weight 600 and -.04em tracking; h1 `clamp(2.25rem,4.5vw,3.5rem)`, h2 `clamp(1.65rem,3vw,2.3rem)`, h3 1.3rem; paragraph line height 1.65. Mobile hero overrides live later in the stylesheet. |
| Brand | `components/Brand.tsx`, `public/brand/mark.svg`; existing light/dark lockup. |
| Layout and spacing | `.container` max 1200px, desktop width `calc(100% - 64px)`; mobile overrides are in `app/globals.css`. Fleet grid gap 24px. Hero row gap 36px desktop / 24px at ≤760px; date panel padding 20px 24px / 18px mobile. These are component rules, not a new global spacing scale. |
| Actions and chips | `.journey-primary/.journey-secondary`: min-height 48px, padding 12px 20px, radius 7px. `.period-chips` gap 8px, buttons min-height 44px, radius 24px and `aria-pressed` selection. Existing `components/ui/Button.tsx` and journey classes coexist; use the pattern of the affected view. |
| Vehicle cards | `components/fleet/VehicleCard.tsx`, `.car-card` white, 1px line border, 10px radius; `.car-image` effective aspect 16/10. Hero verified Corolla image uses object-position 50% 57%, desktop aspect 4/3. Never stretch or substitute unverified imagery. |
| Document cards | `components/customer/DocumentUpload.tsx`; `.document-card` background `#fffaf2`, border `#a7b8be`, radius .75rem, padding 16px (12px horizontal at ≤360px); card content gap .5rem, grid gap 1rem. Native date inputs use border-box/zero minimum width; saved dates use text. Preview max-width 22rem, height 10rem, object-fit contain, background `#e9efee`. These local values are observed implementation, not approved global tokens. |
| Focus/motion | Global focus outline 3px teal/4px offset; document focus `#126b68`/3px offset. `prefers-reduced-motion` rules exist in `app/globals.css`; verify actual behavior and contrast rather than assuming compliance. |

Later CSS rules override earlier ones. Use selectors plus computed styles; line
numbers drift. Avoid normalizing legacy/local values during unrelated UI tasks.

## Reuse map and evidence

- Homepage/journey: `components/home/HeroSection.tsx`, `TripSearch.tsx`,
  `CarFinder.tsx`; `components/journey/{JourneyProvider,JourneyFields,PeriodChips}.tsx`.
- Fleet: `components/fleet/{FleetBrowser,VehicleCard}.tsx`.
- Booking: `components/booking/BookingWizard.tsx`; shared
  `components/customer/{DraftEditor,IntakeFields,DocumentUpload,TripsPortal,SignIn}.tsx`.
- Private draft/document APIs: `app/api/customer/`; data/access rules in
  `lib/customer/{drafts,portal}.ts`. Quote/owner rules stay server-authoritative.
- Local browser fixtures and evidence: `tests/browser/drafts.spec.ts`,
  `portal.spec.ts`, `reconciliation.spec.ts`, `refinement.spec.ts`.
- Approved-history evidence: `/projects/daytona-handoff/coastal-experience-handoff.md`,
  `driver-drafts-handoff.md`, `document-cards/handoff.md`; document-card local
  gallery `/projects/daytona-handoff/document-cards/gallery.html`. These paths
  are persistent workspace records, not required dependencies in a fresh clone.
- Committed behavior detail: `docs/driver-drafts.md`. Handoffs are dated evidence,
  not a substitute for checking current code or a new owner instruction.

## Proposals and lessons

No new visual proposal is approved by this guide. Put observations in
[lessons.md](lessons.md), marking measured defects, hypotheses and owner decisions
separately. During review-only work, recommend changes without implementing them.
