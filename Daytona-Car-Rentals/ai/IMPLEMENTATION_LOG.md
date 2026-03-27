# Daytona Car Rentals — Implementation Log

**Project:** Daytona Car Rentals
**Stack:** Next.js 15 · Firebase Admin/Client · Stripe · Tailwind CSS · TypeScript
**Workflow:** Claude (design/review) → Codex (implement/patch) → Claude (sign-off)

---

## Task Status

| ID | Title | Owner | Status | Deliverable |
|---|---|---|---|---|
| DCR-001 | Define full system architecture | Claude | ✅ Complete | `ai/ARCHITECTURE.md` |
| DCR-002 | Initialize Next.js project structure | Codex | ✅ Complete | Running app |
| DCR-003 | Design UI component system | Claude | ✅ Complete | `ai/DCR-003-ui-system.md` |
| DCR-004 | Build UI component library | Codex | ✅ Complete | `components/ui/` |
| DCR-005 | Design homepage layout | Claude | ✅ Complete | `ai/DCR-005-homepage-layout.md` |
| DCR-006 | Build homepage UI | Codex | ✅ Complete | `app/(public)/page.tsx`, `components/home/` |
| DCR-007 | Design fleet page UX | Claude | ✅ Complete | `ai/DCR-007-fleet-page.md` |
| DCR-008 | Build fleet page | Codex | ✅ Complete | `app/(public)/fleet/`, `components/fleet/` |
| DCR-009 | Design vehicle detail page | Claude | ✅ Complete | `ai/DCR-009-vehicle-detail.md` |
| DCR-010 | Build vehicle detail page | Codex | ✅ Complete | `app/(public)/fleet/[vehicleId]/`, `components/fleet/VehicleBookingCard.tsx`, `components/fleet/VehicleImageGallery.tsx` |
| DCR-011 | Design booking flow (multi-step) | Claude | ✅ Complete | `ai/DCR-011-booking-flow.md` |
| DCR-012 | Build booking form (multi-step) | Codex | ✅ Complete | `app/(customer)/booking/`, `components/booking/`, `components/providers/BookingProvider.tsx` |
| DCR-013 | Implement file uploads | Codex | ✅ Complete | `components/documents/`, `app/api/documents/`, `app/api/me/verification/` |
| DCR-014 | Design Firestore schema | Claude | ✅ Complete | `ai/DCR-014-firestore-schema.md` |
| DCR-015 | Implement Firestore models + API | Codex | ✅ Complete | `lib/services/`, `app/api/bookings/`, `app/api/vehicles/` |
| DCR-016 | Design payment flow | Claude | ✅ Complete | `ai/DCR-016-payment-flow.md` |
| DCR-017 | Implement Stripe integration | Codex | ✅ Complete | `app/api/stripe/`, `lib/stripe/server.ts`, `lib/stripe/webhooks.ts` |
| DCR-018 | Design admin dashboard | Claude | ✅ Complete | `ai/DCR-018-admin-dashboard.md` |
| DCR-019 | Build admin dashboard | Codex | ✅ Complete | `app/(admin)/admin/`, `components/admin/`, `components/layout/AdminSidebar.tsx` |
| DCR-020 | Implement verification workflow | Codex | ✅ Complete | `components/admin/DocumentReviewPanel.tsx`, `app/api/admin/verify-document/`, `app/api/admin/get-document-signed-url/`, `lib/services/documentService.ts` |
| DCR-021 | Harden customer auth guard | Codex | ✅ Complete | `app/(customer)/layout.tsx` |
| DCR-022 | Design admin middleware hardening | Claude | ✅ Complete | `ai/DCR-022-admin-middleware.md` |
| DCR-023 | Implement admin middleware hardening | Codex | ✅ Complete | `app/(admin)/layout.tsx` |
| DCR-024 | Complete admin booking action system | Codex | ✅ Complete | `components/admin/BookingActionsPanel.tsx`, `app/(admin)/admin/bookings/[bookingId]/page.tsx` |
| DCR-025 | Homepage resilience for FeaturedFleet | Codex | ✅ Complete | `components/home/FeaturedFleet.tsx` |
| DCR-026 | Design audit logging system | Claude | ✅ Complete | `ai/DCR-026-audit-logging.md` |
| DCR-027 | Implement audit logging | Codex | ✅ Complete | `lib/services/auditService.ts`, `types/audit.ts`, `firestore.rules`, `firestore.indexes.json` |
| DCR-028 | Design notification system | Claude | ✅ Complete | `ai/DCR-028-notification-system.md` |
| DCR-029 | Implement email notifications | Codex | ✅ Complete | `lib/services/notificationService.tsx`, `emails/` |
| DCR-030 | Implement SMS notifications | Codex | ✅ Complete | `lib/services/notificationService.tsx`, `app/api/cron/booking-reminders/`, `vercel.json` |
| DCR-031 | Design customer portal | Claude | ✅ Complete | `ai/DCR-031-customer-portal.md` |
| DCR-032 | Build customer portal | Codex | ✅ Complete | `app/(customer)/dashboard/`, `components/customer/`, `lib/auth/getServerUserId.ts`, `app/api/me/` |
| DCR-034 | Design dynamic pricing rules | Claude | ✅ Complete | `ai/DCR-034-dynamic-pricing.md` |
| DCR-035 | Implement dynamic pricing | Codex | ✅ Complete | `lib/utils/pricing.ts`, `lib/services/pricingService.ts`, `types/pricing.ts`, `lib/data/pricingRulesSeed.ts` |
| DCR-042 | Implement rate limiting and abuse protection | Codex | ✅ Complete | `lib/security/rateLimit.ts` |
| DCR-043 | Implement monitoring and alerts | Codex | ✅ Complete | `lib/monitoring/monitoring.ts` |
| DCR-037 | Design SEO landing pages | Claude | ✅ Complete | `ai/DCR-037-seo-landing-pages.md` |
| DCR-040 | Design partner booking flow | Claude | ✅ Complete | `ai/DCR-040-partner-booking-flow.md` |
| DCR-039 | Implement analytics tracking | Codex | ✅ Complete | `lib/services/analyticsService.ts`, `types/analytics.ts`, `components/analytics/AnalyticsTracker.tsx`, `app/api/analytics/track/` |
| DCR-044 | Production readiness review | Claude | ✅ Complete | `ai/DCR-044-production-readiness.md` |

---

## Layer Status

### Foundation
- [x] Next.js 15 App Router with route groups: `(public)`, `(auth)`, `(customer)`, `(admin)`
- [x] TypeScript strict mode, Tailwind CSS 3, `@/*` path alias
- [x] Firebase Admin SDK initialised with service account + `applicationDefault()` fallback
- [x] Firebase client SDK initialised
- [x] `server-only` guards on all server-side modules
- [x] `clsx` + `tailwind-merge` via `cn()` in `lib/utils.ts`
- [x] `next.config.ts` — `images.remotePatterns` includes `firebasestorage.googleapis.com`

### Types (`types/`)
- [x] `Vehicle`, `VehicleCategory`, `VehicleFilters`, `FleetFilters`, `VehicleSort`
- [x] `Booking`, `BookingStatus`, `BookingExtras`, `BookingPricing`, `CreateBookingInput`
- [x] `UserProfile`, `UserAddress`, `VerificationStatus`, `UpsertUserProfileInput`, `AuthUser`
- [x] `UserDocument`, `DocumentType`, `DocumentStatus`, `DocumentReviewInput`, `UserVerificationSummary`
- [x] `PaymentStatus`, `ExtrasPricing`
- [x] Barrel re-export from `types/index.ts`

### Firebase Layer (`lib/firebase/`)
- [x] `admin.ts` — `getFirebaseAdminApp`, `getAdminDb`, `getAdminAuth`, `hasFirebaseAdminConfig`
- [x] `client.ts` — Firebase client SDK init
- [x] `converters.ts` — `serializeFirestoreData`, `deserializeFirestoreData` (recursive Date ↔ Timestamp)
- [x] `firestore.ts` — `getDocument`, `setDocument`, `updateDocument`, `deleteDocument`, `addDocument`, `listDocuments`, `getDocumentByField`, `runTransaction`, `requireDb`, `toFirestoreTimestamp`

### Services (`lib/services/`)
- [x] `vehicleService.ts` — `getVehicleById`, `listVehicles`
- [x] `bookingService.ts` — `createBooking` (transactional), `getBookingById`, `listBookingsForUser`, `isVehicleAvailable`, `cancelBooking`, `updateBookingStatus`
- [x] `userService.ts` — `getUserProfile`, `upsertUserProfile`, `updateUserVerificationStatus`, `listUsersByVerificationStatus`
- [x] `documentService.ts` — `upsertUserDocument`, `getUserDocument`, `listUserDocuments`, `reviewUserDocument`, `getUserVerificationSummary`

### Auth Middleware (`lib/middleware/`)
- [x] `withAuth.ts` — `requireAuth` (throws), `withAuth` (HOF wrapper), `AuthUser` type
- [x] Reads `Authorization: Bearer` header or `__session` / `token` cookie
- [x] Extracts `role` and `email` from Firebase ID token claims

### Utilities (`lib/utils/`)
- [x] `lib/utils.ts` — `cn()` (clsx + tailwind-merge), `formatCurrency`
- [x] `dateUtils.ts` — `getDateRangeInDays`, `checkVehicleAvailability`
- [x] `pricing.ts` — `computeBookingPricing` (server-authoritative)
- [x] `storage.ts` — `resolveVehicleImageUrl` (URL passthrough + placeholder fallback)

### Data (`lib/data/`)
- [x] `locations.ts` — `daytonaLocations` static list
- [x] `mockVehicles.ts` — dev seed data

### Stripe (`lib/stripe/`)
- [x] `server.ts` — `getStripeServer`, `retrievePaymentIntent`, `getOrCreateStripeCustomer`, `createPaymentIntentForBooking`, `refundPaymentIntent`, `constructWebhookEvent`, `findBookingByPaymentIntentId`, `syncBookingPaymentStatus`
- [x] `webhooks.ts` — `handleStripeWebhookEvent` (payment_intent.succeeded, payment_intent.payment_failed, charge.refunded)

### API Routes (`app/api/`)
- [x] `GET  /api/bookings/[bookingId]` — auth-guarded, ownership check
- [x] `POST /api/bookings/create` — auth-guarded, server-side pricing, PI verification
- [x] `PATCH /api/bookings/[bookingId]/cancel` — auth-guarded, ownership/admin check, status guard
- [x] `POST /api/vehicles/availability` — single vehicle (`{ available }`) or fleet-wide (`{ unavailableVehicleIds }`)
- [x] `POST /api/stripe/create-payment-intent` — auth-guarded, availability re-check, deposit amount from Firestore
- [x] `POST /api/stripe/webhook` — raw body via `request.text()`, signature verification
- [x] `POST /api/admin/verify-document` — admin-only, self-review block, rejection reason required
- [x] `POST /api/admin/update-booking-status` — admin-only, `canTransitionBooking` state machine
- [x] `POST /api/admin/get-document-signed-url` — admin-only, 60-min signed URL
- [x] `POST /api/documents/upload` — auth-guarded, upserts document metadata
- [x] `GET  /api/me/verification` — auth-guarded, parallel profile + verification fetch
- [x] `GET  /api/me/bookings` — auth-guarded, returns bookings scoped to authenticated user (DCR-032)
- [x] `PATCH /api/me/profile` — auth-guarded; validates displayName, phone, dateOfBirth, smsOptIn; protected fields never overwritten (DCR-032)

### UI Components (`components/`)
- [x] `ui/Button.tsx`
- [x] `ui/Card.tsx`
- [x] `ui/Input.tsx`
- [x] `ui/Badge.tsx`
- [x] `ui/Modal.tsx`
- [x] `ui/Spinner.tsx`
- [x] `layout/Navbar.tsx`
- [x] `layout/Footer.tsx`
- [x] `layout/SiteShell.tsx`
- [x] `fleet/VehicleCard.tsx` + `VehicleCardSkeleton`
- [x] `fleet/VehicleGrid.tsx`
- [x] `fleet/VehicleFilters.tsx` (desktop sidebar + mobile drawer)
- [x] `fleet/FleetCatalog.tsx` (URL-synced filter state, useTransition)
- [x] `fleet/VehicleImageGallery.tsx`
- [x] `fleet/VehicleBookingCard.tsx`
- [x] `home/HeroSection.tsx`
- [x] `home/TrustBar.tsx`
- [x] `home/FeaturedFleet.tsx` (async RSC)
- [x] `home/HowItWorks.tsx`
- [x] `home/WhyDaytona.tsx`
- [x] `home/Testimonials.tsx`
- [x] `home/CTABanner.tsx`
- [x] `booking/BookingWizard.tsx` + steps (DCR-012)
- [x] `documents/DocumentUpload.tsx` — client-side MIME + size validation, progress bar, image preview
- [x] `admin/DocumentReviewPanel.tsx` — signed-URL preview modal, approve/reject modals (I-010 blocker: see below)
- [x] `admin/BookingTable.tsx`, `CustomerTable.tsx`, `RevenueChart.tsx`, `StatsCard.tsx` (DCR-019)
- [x] `admin/BookingActionsPanel.tsx` — `useTransition` + `router.refresh()`; server-side state machine filtering; cancel/refund confirmation modal (DCR-024)
- [x] `layout/CustomerSidebar.tsx` — 4 nav items, `usePathname` active state, Browse Fleet link (DCR-032)
- [x] `customer/VerificationStatusBanner.tsx` — 4 status variants (DCR-032)
- [x] `customer/DocumentUploadCard.tsx` — wrapper around DocumentUpload with status, last-uploaded date, rejection reason (DCR-032)
- [x] `customer/CustomerCancelPanel.tsx` — confirmation modal, no reason field, `isPending` guard, `router.refresh()` on success (DCR-032)
- [x] `customer/ProfileForm.tsx` — RHF + zod; phone refine (`isPortalPhoneNumber`); 18+ age validation; smsOptIn checkbox (DCR-032)

### Pages (`app/`)
- [x] `(public)/page.tsx` — homepage with all 7 sections
- [x] `(public)/about/page.tsx`
- [x] `(public)/contact/page.tsx`
- [x] `(public)/fleet/page.tsx` — RSC, passes vehicles to FleetCatalog
- [x] `(public)/fleet/[vehicleId]/page.tsx` — RSC, generateMetadata, notFound()
- [x] `(auth)/login/page.tsx`
- [x] `(customer)/layout.tsx` — auth guard
- [x] `(customer)/dashboard/page.tsx`
- [x] `(admin)/layout.tsx` — admin auth guard
- [x] `(admin)/admin/dashboard/page.tsx`
- [x] `(customer)/booking/[vehicleId]/page.tsx` (DCR-012)
- [x] `(customer)/booking/confirmation/[bookingId]/page.tsx` (DCR-012)
- [x] `(admin)/admin/bookings/` (DCR-019)
- [x] `(admin)/admin/fleet/` (DCR-019)
- [x] `(admin)/admin/customers/` (DCR-019)
- [x] `(admin)/admin/verifications/` (DCR-019)
- [x] `(customer)/dashboard/page.tsx` — parallel fetch of profile, verification, bookings; upcoming bookings + stat cards (DCR-032)
- [x] `(customer)/dashboard/bookings/page.tsx` — full booking history with vehicle names, deposit amount, status (DCR-032)
- [x] `(customer)/dashboard/bookings/[bookingId]/page.tsx` — booking info, timeline, pricing summary, cancel panel; ownership check redirects (DCR-032)
- [x] `(customer)/dashboard/documents/page.tsx` — VerificationStatusBanner + DocumentUploadCard for both doc types (DCR-032)
- [x] `(customer)/dashboard/profile/page.tsx` — RSC wrapper passing full profile to ProfileForm (DCR-032)

### Config / Infrastructure
- [x] `next.config.ts` — remotePatterns for firebasestorage.googleapis.com
- [x] `tailwind.config.ts`
- [x] `tsconfig.json`
- [x] `.env.local.example`
- [x] `firestore.rules`
- [x] `storage.rules`
- [x] `firestore.indexes.json`
- [x] `firebase.json`
- [x] `middleware.ts` — Next.js edge middleware for route protection
- [ ] Vercel project configured

---

## Review Log

| Date | Reviewer | Task | Outcome |
|---|---|---|---|
| 2026-03-26 | Claude | DCR-015 initial | 6 issues found: no auth, client-trusted pricing, no transaction, unbounded query, cancel status gap |
| 2026-03-26 | Claude | DCR-015 patch | All 6 resolved. ✅ Signed off. |
| 2026-03-26 | Claude | DCR-006, DCR-008 | ✅ Signed off. Flagged: `next.config.ts` remotePatterns (I-004), `cn()` upgrade (must-fix), FeaturedFleet error boundary. |
| 2026-03-26 | Claude | DCR-010, DCR-017 | ✅ Signed off. I-004 and `cn()` flagged as must-fix before DCR-012. Note on `getOrCreateStripeCustomer` profile ordering. |
| 2026-03-26 | Claude | I-004 + `cn()` patch | ✅ Verified. `next.config.ts` remotePatterns correct. `cn()` uses `clsx` + `tailwind-merge`. Build passes. I-004 closed. |
| 2026-03-26 | Claude | DCR-013, DCR-020 | Conditional pass. 1 blocker (I-010): `approveAll` broken by mid-loop `window.location.reload()`. 1 should-fix (I-011): silent Storage failure creates orphaned Firestore records. 1 housekeeping (I-012): stale DCR-013 comment in Step3Documents. |
| 2026-03-26 | Claude | DCR-013/DCR-020 patch | ✅ All three items resolved. I-010, I-011, I-012 closed. DCR-013 and DCR-020 fully signed off. |
| 2026-03-26 | Codex audit | DCR-012, DCR-019 | Implemented and build-clean, but not ready for unconditional sign-off. Residual gaps: customer booking routes are not auth-guarded, `/admin` middleware does not verify admin role, sidebar verification badge is not realtime, and admin booking detail actions are not wired to live transitions/refunds. |
| 2026-03-26 | Claude | DCR-021 | ✅ Signed off. RSC layout verifies Firebase ID token via `adminAuth.verifyIdToken`. I-006 closed. |
| 2026-03-26 | Claude | DCR-012 | ✅ Signed off. Pricing is server-authoritative at PI and booking-create time. Steps, wizard, and payment flow correct. Two minor observations (orphaned PIs on back-nav; infinite spinner with no Stripe config) — both accepted. |
| 2026-03-26 | Claude | DCR-019 | Conditional pass. Dashboard structure correct. I-016 (unwired action buttons) deferred to DCR-024. I-014 (no admin role check in layout) deferred to DCR-023. I-015 (non-realtime pending count) accepted as deferred. |
| 2026-03-26 | Claude | DCR-022 spec | ✅ Complete — `ai/DCR-022-admin-middleware.md`. Strategy: full token verify + `role === admin` in `app/(admin)/layout.tsx` RSC; edge middleware stays as UX cookie check. |
| 2026-03-26 | Claude | DCR-023 | ✅ Signed off. Admin layout mirrors customer auth pattern exactly per spec. I-014 closed. |
| 2026-03-26 | Claude | DCR-024 | ✅ Signed off. Actions filtered by state machine server-side; cancel route issues Stripe refund before Firestore write; confirmation modal with `isPending` guard correct. One should-fix (I-017): `canCancel` includes `active` bookings — service rejects them but button still renders. |
| 2026-03-26 | Claude | DCR-025 | ✅ Signed off. try/catch wraps `listVehicles`; empty-result and error states render contained fallback with section heading and fleet link intact. I-007 closed. |
| 2026-03-26 | Claude | DCR-026 spec | ✅ Complete — `ai/DCR-026-audit-logging.md`. Top-level `audit_logs` collection; best-effort `logAuditEvent`; 5 integration points across bookingService, documentService, userService, stripe/webhooks, stripe/server; 3 composite indexes; admin-read-only security rule. |
| 2026-03-26 | Claude | DCR-027 | ✅ Signed off. All integration points wired; actor context flows from API routes into service layer; best-effort pattern correct; firestore rules and indexes match spec. |
| 2026-03-26 | Claude | DCR-028 spec | ✅ Complete — `ai/DCR-028-notification-system.md`. Resend + React Email for transactional email; Twilio for SMS with opt-in gate; 10 email templates + 4 SMS events; cron job for pickup/return reminders; `smsOptIn` field added to `UserProfile`. |
| 2026-03-26 | Claude | DCR-029, DCR-030 | ✅ Signed off. All 10 email handlers + 4 SMS events implemented; best-effort pattern consistent throughout; cron route auth correct; `normalizePhoneNumber` throws on bad format but is contained inside `sendSms` try/catch — silently dropped. Note: malformed phone numbers in Firestore will silently drop SMS until DCR-032 adds phone validation to the customer portal. |
| 2026-03-26 | Claude | DCR-037 spec | ✅ Complete — `ai/DCR-037-seo-landing-pages.md`. 7 landing pages under `/rentals/`: airport, SUV, luxury, van, Daytona 500, Bike Week, Spring Break. Shared `components/landing/` kit (LandingHero, LandingFeatures, LandingFAQ, LandingCTA, JsonLd). LocalBusiness + FAQPage JSON-LD schema. `app/sitemap.ts` (static + dynamic vehicle entries), `app/robots.ts`. Footer Rentals column with 7 internal links. Full copy, metadata, and vehicle filter specs per page. |
| 2026-03-26 | Claude | DCR-040 spec | ✅ Complete — `ai/DCR-040-partner-booking-flow.md`. `partners` Firestore collection with code-based attribution. Client-side `ReferralTracker` saves `?ref=` param to sessionStorage. Booking creation validates code server-side via `getPartnerByCode`; attaches `partnerId` when active, stores `referralCode` verbatim regardless. Admin `/admin/partners` page with stats. Referral row added to admin booking detail. `"referral_click"` analytics event. Never blocks a booking if code is missing or unknown. |
| 2026-03-26 | Claude | I-019 + I-020 patch | ✅ Both closed. `notifyPaymentFailed` removed from `payment_intent.succeeded` case; `void reportMonitoringEvent({ severity: "warning", alert: false })` added in `payment_intent.payment_failed` case. |
| 2026-03-26 | Claude | DCR-039 | ✅ Signed off unconditionally. Best-effort analytics service consistent with audit/notification patterns. `AnalyticsTracker` uses `sendBeacon` + `keepalive` fetch fallback. Client steps call API route directly (correct — can't touch server-only service). `checkout_started` and `booking_created` fired from server-side API routes for accuracy. Firestore rule: admin read, no client write. In-memory aggregation over 1000 events appropriate at this scale. |
| 2026-03-26 | Claude | DCR-043 | Conditional pass. Monitoring module clean: severity-mapped console methods, Slack-compatible webhook payload, `MONITORING_ENV` override, best-effort webhook delivery. All 7 failure paths wired with well-calibrated severity/alert choices. One blocker (I-019): `notifyPaymentFailed` called inside `payment_intent.succeeded` webhook case — sends failure notification to customers who paid successfully. One should-fix (I-020): no monitoring event for `payment_intent.payment_failed` case. I-018 closed (header priority corrected). |
| 2026-03-26 | Claude | DCR-035 | ✅ Signed off unconditionally. Per-day rule engine correct: multiplicative surcharge stacking, best-tier long-term discount, year-wrap date ranges handled. `Math.round` per day prevents accumulation drift. `Math.max(adjustedBase - baseAmount, 0)` guards against misconfigured sub-1.0 multipliers. Both server-authoritative pricing paths (PI creation + booking creation) updated. Firestore rule added. Client-side wizard preview uses flat-rate intentionally — server remains authoritative. |
| 2026-03-26 | Claude | DCR-042 | ✅ Signed off. In-memory rate limiting with `globalThis` Map, per-policy windows, and `enforceRateLimit → NextResponse | null` interface. IP-scoped pre-auth limiting on booking create and PI create; userId-scoped post-auth limiting on document upload, cancel, profile, and admin actions. Standard `Retry-After` + `X-RateLimit-*` headers. One should-fix (I-018): `x-forwarded-for[0]` is spoofable on Vercel — `x-real-ip` should be checked first. Per-instance store limitation accepted at this traffic level. |
| 2026-03-26 | Claude | DCR-034 spec | ✅ Complete — `ai/DCR-034-dynamic-pricing.md`. Per-day rule engine with three rule types: weekend surcharge, date_range (fixed + annually recurring), long_term_discount. `computeBookingPricing` gains optional `rules` param (backward-compatible). New `pricingService.ts` owns Firestore fetch and wraps pure function. `BookingPricing` extended with optional `surchargeAmount`, `discountAmount`, `appliedRuleNames`. 11 seed rules for Daytona events. Two API call sites updated. UI breakdown in wizard + customer portal. |
| 2026-03-26 | Claude | DCR-031 spec | ✅ Complete — `ai/DCR-031-customer-portal.md`. 5 portal pages (dashboard, bookings, booking detail, documents, profile); `CustomerSidebar`; `getServerUserId` helper; `GET /api/me/bookings` + `PATCH /api/me/profile`; phone validation in `ProfileForm` to address silent SMS drop issue. |
| 2026-03-26 | Claude | DCR-032 | ✅ Signed off. All 5 portal pages implemented and auth-guarded via `getServerUserId`. Ownership check in booking detail uses `redirect` (not `notFound`) to prevent booking ID enumeration. `PATCH /api/me/profile` spreads existing profile and never touches `email`, `role`, `verificationStatus`, or `stripeCustomerId`. Phone validation in `ProfileForm` (zod refine + server-side regex) closes the silent SMS drop gap flagged in DCR-029/030 review. `CustomerSidebar` active state, layout grid, and Browse Fleet link correct. `CustomerCancelPanel` `isPending` guard prevents double-submit. No open issues. |
| 2026-03-26 | Claude | DCR-033 | ✅ Signed off. `syncRepeatCustomerProfile` wired as best-effort `void` call in `bookingService.updateBookingStatus` at the `"completed"` transition — correct trigger. Flags: `repeatCustomer` (1+ completed booking), `fastTrackEligible` (repeat + verified), `loyaltyDiscountEligible` (3+ bookings). Admin customer detail page surfaces all flags. Promo service enforces `repeatCustomersOnly`. `fastTrackEligible` is a data signal only — no auto-approval; appropriate at this stage. |
| 2026-03-26 | Claude | DCR-036 | ✅ Signed off. Case-insensitive code lookup (uppercased), expiration, `minSubtotalAmount`, `maxDiscountAmount`, `repeatCustomersOnly` all enforced in `applyPromoCodeToPricing`. Both PI creation and booking creation apply and cross-validate the code via PI metadata — prevents code-swapping between wizard steps. |
| 2026-03-26 | Claude | DCR-038 | ✅ Signed off. All 7 landing pages have `createLandingMetadata`, `localBusinessSchema` + `buildFaqSchema` JSON-LD, real FAQs, feature grids, and live Firestore vehicle queries. `force-dynamic` applied. Spring Break uses `Promise.all` for SUV + van combined — matches spec. |
| 2026-03-26 | Claude | DCR-041 | ✅ Signed off. All spec deliverables present: `ReferralTracker` captures `?ref=` to sessionStorage and fires `referral_click` analytics once per session. `partnerService` never throws. Booking create resolves `referralCode` to `partnerId` without blocking. `referralCode` stored verbatim regardless of resolution. Admin `/admin/partners` page with `PartnerStats`. Partners nav item in `AdminSidebar`. |
| 2026-03-26 | Claude | Admin fleet management (untracked) | ✅ Signed off. `POST /api/admin/vehicles` and `PATCH /api/admin/vehicles/[vehicleId]` both use `withAuth` + `role === 'admin'` + `adminMutation` rate limit. `VehicleForm` gets fresh ID token and sends as Bearer header. Dollar→cents conversion correct. Firebase Storage upload uses client token so Storage rules enforce admin-only writes. 5-image cap and at least-1-image requirement enforced. Accepted limitation: orphaned Storage images if admin uploads then cancels. |
| 2026-03-26 | Claude | DCR-044 | CONDITIONAL GO. No blockers. Auth layers sound: edge middleware (cookie presence) + RSC layouts (full token verify + role) + API `requireAuth` (per-mutation). Booking create integrity chain complete (PI ownership, vehicle match, server-recomputed price match). Firestore rules: all 9 collections covered. Storage rules: size + MIME constraints enforced. Stripe webhook: signature verification correct. Cron: `CRON_SECRET` bearer auth. Two should-fix items: N-001 (middleware matcher missing `/dashboard/:path*`) and N-002 (no HTTP security headers). I-013 and I-014 closed as stale. I-008 documented as operational note. Full deployment checklist in `ai/DCR-044-production-readiness.md`. |

---

## Known Issues / Deferred Items

| Ref | Issue | Status |
|---|---|---|
| I-001 | `types/index.ts` exports `ButtonVariant` and `NavItem` — UI types in domain barrel | Open — future tidy-up |
| I-002 | `withAuth` HOF catches all errors as 401; `bookings/create` uses `requireAuth` directly — style inconsistency | Open — future tidy-up |
| I-003 | `isVehicleAvailable` redundant in-memory status filter after query already filters by status | Open — future tidy-up |
| I-004 | `next.config.ts` missing `images.remotePatterns` for Firebase Storage | ✅ Closed 2026-03-26 |
| I-005 | `tailwind.config.ts` brand tokens differ from DCR-003 spec (`brand.accent` vs `brand.500` scale) | Open — DCR-004 tidy-up |
| I-006 | `middleware.ts` not created — route protection in layout files only, not at the edge | ✅ Closed 2026-03-26 — file created and active on `/admin/:path*` |
| I-007 | `FeaturedFleet` RSC has no error boundary — unconfigured Firebase breaks homepage | ✅ Closed 2026-03-26 — try/catch added; empty-result and error states both render `FeaturedFleetFallback` with fleet link |
| I-008 | Vehicle images in Firestore must be stored as full download URLs, not Storage paths — `resolveVehicleImageUrl` falls back to placeholder for raw paths | Open — document in admin fleet form (DCR-019) and seeding guide |
| I-009 | `getOrCreateStripeCustomer` writes sparse profile if user profile doesn't exist yet — profile should be collected before payment step | Open — DCR-012 ordering |
| I-010 | `approveAll` in `DocumentReviewPanel` only approves first document — `reviewDocument` calls `window.location.reload()` inside the `for...of` loop, terminating it after the first iteration | ✅ Closed 2026-03-26 — split into `submitDocumentReview` (no reload) + `reviewDocument` (reload); `approveAll` reloads once at end |
| I-011 | `DocumentUpload.tsx` inner catch swallows all Storage errors and proceeds to write metadata — in production this creates orphaned Firestore records when the actual file upload failed | ✅ Closed 2026-03-26 — only `FirebaseStorageConfigError` (by name check) is swallowed; all other errors re-thrown |
| I-012 | Stale comment in `Step3Documents.tsx:90`: "DCR-013 will connect these uploads to Firebase Storage" — DCR-013 is complete | ✅ Closed 2026-03-26 — replaced with user-facing copy |
| I-013 | Customer booking routes under `app/(customer)/` are not actually auth-guarded yet. `app/(customer)/layout.tsx` is a presentational wrapper, but `Step5Payment` requires a signed-in Firebase user, so the flow can be entered anonymously and only fails at payment time. | ✅ Closed 2026-03-26 — stale; `app/(customer)/layout.tsx` calls `adminAuth.verifyIdToken` since DCR-021. Issue written before DCR-021 landed. |
| I-014 | `/admin` edge middleware only checks for the presence of `__session`; it does not verify the Firebase ID token or enforce `role === 'admin'`, so non-admin users with any session cookie can reach admin pages until server-side API checks kick in. | ✅ Closed 2026-03-26 — stale; `app/(admin)/layout.tsx` does full token verify + `role === 'admin'` check since DCR-023. Issue written before DCR-023 landed. |
| I-015 | `AdminSidebar` pending verification badge is loaded once on the server in `app/(admin)/layout.tsx`; it is not realtime as required by the DCR-018 spec. | Open — move to client listener or live polling/subscription |
| N-001 | `middleware.ts` matcher covers `/dashboard` exact path only, not `/dashboard/:path*`. Sub-routes (bookings, profile, documents) bypass the edge redirect and are redirected by the RSC CustomerLayout instead. No security risk — layout auth is sound. | Open (SHOULD FIX) — change matcher to `/dashboard/:path*` |
| N-002 | No HTTP security headers configured in `next.config.ts`. `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` absent from all responses. | Open (SHOULD FIX) — add `headers()` to `next.config.ts` |
| N-003 | Cron reminder route fetches `getUserProfile` + `getVehicleById` sequentially per booking (N+1). Fine at current scale; could time out at high volume. | Open (DEFER) — revisit if cron duration approaches 60 seconds |
| N-004 | `npm audit` reports a low-severity transitive dependency chain under `firebase-admin` (`@google-cloud/storage -> teeny-request -> http-proxy-agent -> @tootallnate/once`). Lockfile is aligned and the issue is primarily in the Admin Storage path used for signed document URLs. | Open (MAINTENANCE) — do not use `npm audit fix --force`; revisit during intentional `firebase-admin` / Google Cloud dependency upgrades |
| I-016 | `app/(admin)/admin/bookings/[bookingId]/page.tsx` shows status action buttons, but they are not conditionally rendered by allowed state and are not wired to `/api/admin/update-booking-status` or cancel/refund actions yet. | ✅ Closed 2026-03-26 — `BookingActionsPanel` wired to live API with `canTransitionBooking` filtering and cancel/refund confirmation UX |
| I-017 | `canCancel` in booking detail page includes `active` bookings — Cancel + Refund button renders but `cancelBooking` service rejects active bookings; error shown to admin but button is misleading | ✅ Closed 2026-03-26 — `"active"` added to exclude list |
| I-018 | `getRequestFingerprint` reads `x-forwarded-for.split(",")[0]` first — spoofable on Vercel where the platform appends (not overrides) the header. `x-real-ip` (set by Vercel to the real client IP) should be checked first | ✅ Closed 2026-03-26 — header priority corrected to `realIp \|\| cloudflareIp \|\| forwardedFor[0]` |
| I-019 | `webhooks.ts` calls `notifyPaymentFailed` inside the `payment_intent.succeeded` case — sends a payment failure email to customers who successfully paid | ✅ Closed 2026-03-26 — call removed entirely |
| I-020 | `payment_intent.payment_failed` switch case has no `reportMonitoringEvent` call — payment failures are not visible in the structured log/alert stream | ✅ Closed 2026-03-26 — `void reportMonitoringEvent({ severity: "warning", alert: false })` added |
