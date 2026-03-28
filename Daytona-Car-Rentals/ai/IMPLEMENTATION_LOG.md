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
| DCR-045 | Design protection package system | Claude | ✅ Complete | `ai/DCR-045-protection-packages.md` |
| DCR-046 | Implement protection package selection and pricing | Codex | ✅ Complete | `types/protection.ts`, `lib/protection/config.ts`, `components/booking/steps/Step2Extras.tsx`, `components/providers/BookingProvider.tsx`, `lib/utils/pricing.ts` |
| DCR-047 | Enforce insurance requirement logic | Codex | ✅ Complete | `app/api/bookings/create/route.ts`, `components/booking/steps/Step3Documents.tsx` |
| DCR-048 | Integrate protection package with Stripe and booking integrity | Codex | ✅ Complete | `app/api/stripe/create-payment-intent/route.ts`, `lib/stripe/server.ts` |
| DCR-049 | Surface protection package in admin and customer views | Codex | ✅ Complete | `components/booking/ProtectionPackageBadge.tsx`, `app/(admin)/admin/bookings/[bookingId]/page.tsx`, `components/admin/BookingTable.tsx`, `app/(customer)/dashboard/bookings/page.tsx`, `app/(customer)/dashboard/bookings/[bookingId]/page.tsx` |
| DCR-050 | ABI coverage alignment and policy validation | Claude | ✅ Complete | `ai/DCR-050-abi-coverage-alignment.md` |
| DCR-051 | Design pickup and dropoff checklist system | Claude | ✅ Complete | `ai/DCR-051-checklist-system.md` |
| DCR-052 | Implement pickup and dropoff checklist workflow | Codex | ✅ Complete | `types/checklist.ts`, `lib/services/checklistService.ts`, `app/api/admin/bookings/[bookingId]/checklists/`, `app/(admin)/admin/bookings/[bookingId]/checklist/[type]/page.tsx`, `app/(customer)/dashboard/bookings/[bookingId]/checklist/[type]/page.tsx`, `components/admin/ChecklistForm.tsx`, `components/admin/ChecklistView.tsx` |
| DCR-053 | Implement customer and admin signature capture | Codex | ✅ Complete | `components/admin/SignaturePad.tsx` (canvas pointer events, toDataURL, mobile touch-none) |
| DCR-054 | Design admin booking adjustments and post-booking charges | Claude | ✅ Complete | `ai/DCR-054-booking-adjustments.md` |
| DCR-055 | Implement admin adjustments and payment requests | Codex | ✅ Complete | `types/adjustment.ts`, `lib/services/adjustmentService.ts`, `app/api/admin/bookings/[bookingId]/adjustments/`, `lib/stripe/webhooks.ts`, `lib/stripe/server.ts`, `components/admin/AdjustmentPanel.tsx`, `components/admin/AddAdjustmentModal.tsx`, `app/(admin)/admin/bookings/[bookingId]/page.tsx`, `app/(customer)/dashboard/bookings/[bookingId]/page.tsx`, `firestore.rules`, `firestore.indexes.json` |
| DCR-056 | Implement booking draft recovery | Codex | ✅ Complete | `components/providers/BookingProvider.tsx`, `components/booking/BookingWizard.tsx`, `components/booking/ClearBookingDraftOnMount.tsx` |
| DCR-057 | Design magic link authentication flow | Claude | ✅ Complete | `ai/DCR-057-magic-link-auth.md` |
| DCR-058 | Implement magic link authentication | Codex | ✅ Complete | `app/api/auth/magic-link/route.ts`, `app/api/auth/complete-registration/route.ts`, `emails/MagicLinkEmail.tsx`, `lib/auth/clientSession.ts`, `app/(auth)/auth/verify/page.tsx`, `app/(auth)/auth/magic-link-sent/page.tsx`, `components/auth/MagicLinkRequestForm.tsx`, `components/booking/AuthGate.tsx`, `components/booking/EmailEntryStep.tsx`, `components/booking/steps/Step5Payment.tsx`, `components/auth/LoginForm.tsx`, `lib/security/rateLimit.ts`, `middleware.ts`, `components/providers/BookingProvider.tsx`, `lib/utils/bookingDraft.ts` |
| DCR-059 | Enable booking flow without explicit login | Codex | ✅ Complete | `BookingProvider.tsx`, `BookingWizard.tsx`, `bookingDraft.ts`, `page.tsx` (booking), `ClearBookingDraftOnMount.tsx` |
| DCR-060 | Link guest sessions to persistent user accounts | Codex | ✅ Complete | `AuthGate.tsx`, `EmailEntryStep.tsx`, `Step3Documents.tsx`, `DocumentUpload.tsx`, `BookingProvider.tsx`, `BookingWizard.tsx`, `ClearBookingDraftOnMount.tsx` |
| DCR-061 | Add booking recovery via email | Codex | ✅ Complete | `BookingRecoveryPanel.tsx`, `BookingWizard.tsx`, `magic-link-sent/page.tsx`, `page.tsx` (booking), `BookingProvider.tsx` |
| DCR-062 | Harden auth integrity for magic link flow | Claude | ✅ Complete | `ai/DCR-062-magic-link-auth-integrity.md` |
| DCR-063 | Design insurance control plane | Claude | ✅ Complete | `ai/DCR-063-insurance-control-plane.md` |
| DCR-064 | Implement insurance domain types + Firestore schema | Codex | ✅ Complete | `types/insurance.ts`, Firestore schema/rules/index updates |
| DCR-065 | Implement renter policy verification workflow | Codex | ✅ Complete | `lib/services/insuranceVerificationService.ts`, `app/api/insurance/verify-renter-policy/route.ts` |
| DCR-066 | Add booking status split (payment authorized vs insurance cleared) | Codex | ✅ Complete | Booking flow + Stripe webhook updates |
| DCR-067 | Build admin insurance review panel | Codex | ✅ Complete | `components/admin/InsuranceReviewPanel.tsx`, admin insurance API routes |
| DCR-068 | Implement coverage decision engine | Codex | ✅ Complete | `lib/insurance/evaluateCoverage.ts`, `lib/insurance/rules.ts`, `lib/services/coverageDecisionService.ts` |
| DCR-069 | Add embedded insurance provider adapter interface | Codex | ✅ Complete | `lib/insurance/providers/` |
| DCR-070 | Implement first provider integration | Codex | ✅ Complete | `lib/insurance/providers/axle.ts`, provider-backed renter policy verification wiring |
| DCR-071 | Build claims evidence package generator | Codex | ✅ Complete | `lib/services/claimsEvidenceService.ts`, admin endpoint |
| DCR-072 | Add channel-aware booking compliance rules | Codex | ✅ Complete | `lib/services/channelComplianceService.ts`, booking enforcement, admin channel metadata |
| DCR-073 | Design rental agreement system | Claude | ✅ Complete | `ai/DCR-073-rental-agreement.md` |
| DCR-074 | Implement rental agreement system | Codex | ✅ Complete | `types/rentalAgreement.ts`, `lib/services/rentalAgreementService.ts`, agreement API routes, Step 4 consent capture, pickup signature persistence |

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
- [x] `ProtectionPackageId`, `ProtectionPackage`, `ProtectionPricing` (DCR-045/046)
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
- [x] `protectionService.ts` — `getProtectionPricing` (Firestore fetch with fallback) (DCR-046)

### Auth Middleware (`lib/middleware/`)
- [x] `withAuth.ts` — `requireAuth` (throws), `withAuth` (HOF wrapper), `AuthUser` type
- [x] Reads `Authorization: Bearer` header or `__session` / `token` cookie
- [x] Extracts `role` and `email` from Firebase ID token claims

### Utilities (`lib/utils/`)
- [x] `lib/utils.ts` — `cn()` (clsx + tailwind-merge), `formatCurrency`
- [x] `dateUtils.ts` — `getDateRangeInDays`, `checkVehicleAvailability`
- [x] `pricing.ts` — `computeBookingPricing` (server-authoritative; extended with `protectionPackage` + `ProtectionPricing` params; `protectionAmount` + modified `depositAmount` in output) (DCR-046)
- [x] `storage.ts` — `resolveVehicleImageUrl` (URL passthrough + placeholder fallback)
- [x] `lib/protection/config.ts` — `getProtectionPackageDefinition`, `listProtectionPackages`, `isProtectionPackageId`, `getFallbackProtectionPricing` (DCR-046)

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
- [x] `GET  /api/booking/protection-pricing` — public; returns `protection_pricing/current` with fallback (DCR-046)

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
- [x] `booking/ProtectionPackageBadge.tsx` — color-coded badge (gray/blue/gold) for basic/standard/premium (DCR-049)
- [x] `booking/steps/Step2Extras.tsx` — protection package radio card group at top (default: standard); CDW extra removed; live deposit preview per tier (DCR-046)
- [x] `booking/steps/Step3Documents.tsx` — `insuranceRequired` flag gates insurance upload; `insuranceRejected` blocks Continue with inline red banner and recovery message (DCR-047 + patch)

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
- [x] `(customer)/dashboard/bookings/page.tsx` — `ProtectionPackageBadge` on each booking card (DCR-049)
- [x] `(customer)/dashboard/bookings/[bookingId]/page.tsx` — Protection section: package name, liability label, protection total (DCR-049)
- [x] `(admin)/admin/bookings/[bookingId]/page.tsx` — Protection section with insurance-on-file status; amber pre-pickup warning banner for `confirmed + basic + pending insurance` (DCR-049 + patch)

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
| 2026-03-27 | Claude | DCR-045 spec | ✅ Complete — `ai/DCR-045-protection-packages.md`. Three tiers: basic ($0/day, renter's own insurance required, 1.0× deposit), standard ($25/day configurable, CDW incl., $500 deductible, 1.0× deposit), premium ($45/day configurable, $0 deductible, 0.5× deposit). CDW extra deprecated. `protection_pricing/current` Firestore doc (admin-editable). `protectionAmount` + modified `depositAmount` added to `BookingPricing`. Protection placed at top of Step 2; default standard. Full validation matrix and acceptance criteria per DCR-046–049. |
| 2026-03-27 | Claude | DCR-050 spec | ✅ Complete — `ai/DCR-050-abi-coverage-alignment.md`. Period N (not rented, ABI primary) and Period R (on-rental, coverage stacked by tier: basic=ABI contingent/renter primary, standard=ABI primary $500 ded., premium=ABI primary $0 ded.). Server-side checkout validation checklist (5 rules). Admin operational workflow: pre-pickup insurance check for basic, incident/claim procedures per tier. Coverage matrix table. |
| 2026-03-27 | Claude | DCR-046–049 | Conditional pass. Core feature correct: tiers, pricing, deposit modifier, Stripe metadata, server guards all match spec. Two patch items: (1) Step3 `documentsReady` check uses `insuranceUploaded` only — rejected insurance not blocked client-side, user discovers at payment time. (2) Admin booking detail missing amber pre-pickup warning for confirmed+basic+pending insurance. |
| 2026-03-27 | Claude | DCR-046–049 patch | ✅ Both patches verified. Step3: `insuranceRejected` flag (`insuranceRequired && insuranceStatus === 'rejected'`) added to `BookingState`; Continue button `disabled={!documentsReady \|\| insuranceRejected}`; red banner shown; re-upload resets status to `'pending'`. Admin detail: `needsInsuranceReviewWarning` gates amber banner on `confirmed + basic + pending`. DCR-046–049 fully signed off. |
| 2026-03-27 | Claude | `computeRiskScore()` risk engine | ✅ Signed off. Score thresholds calibrated correctly across age, license, insurance, booking timing, vehicle type, history, and payment signals. `getAllowedProtectionPackagesForRisk` correctly restricts tiers per level. Both API routes (PI creation + booking creation) enforce risk check server-side. `createBooking` stores all risk fields and forces `pending_verification` + admin note for high-risk. Frontend treats profile as advisory; auto-corrects selection on load. Two notes: I-021 (should-fix: `riskProfileLoading` can get stuck true if dates change mid-fetch); I-022 (defer: redundant Firestore reads from triple risk evaluation in `bookings/create`). |
| 2026-03-27 | Claude | DCR-051 spec | ✅ Complete — `ai/DCR-051-checklist-system.md`. Sub-collection at `bookings/{bookingId}/checklists/{type}`. Types: pickup/dropoff. Fields: fuelLevel, odometerMiles, conditionNotes, damageNoted, photoRefs, adminSignature, customerSignature. `confirmed → active` and `active → completed` transitions guarded by submitted checklist. 3 API routes. Admin full-page form; customer read-only view. Photos in Storage at `bookings/{bookingId}/checklists/{type}/photos/`. Audit events for draft save, submit, and each booking transition. |
| 2026-03-27 | Claude | DCR-054 spec | ✅ Complete — `ai/DCR-054-booking-adjustments.md`. 4 adjustment types: extension (updates booking.endDate; server-computes amount), fee (+cents, payment request), credit (-cents, applied immediately), correction (±cents). Append-only sub-collection at `bookings/{bookingId}/adjustments/{id}`. 4 API routes + webhook handler for `checkout.session.completed`. Balance computed on-demand (never stored). Stripe Payment Link for fee/extension collection. `notifyAdjustmentPaymentRequired` email. Admin modal UI + customer portal pending-payment display. |
| 2026-03-27 | Claude | DCR-052 + DCR-053 | ✅ Signed off. Transition guards in `bookingService.updateBookingStatus` correct and authoritative. API validates all edge cases (damage description, 10-photo cap, both signatures required on submit, booking status pre-check, read-only after submission). SignaturePad uses pointer events + touch-none. Customer page ownership check + draft not customer-visible. Auth via cookie (correct pattern). I-023 logged: partial failure where checklist writes but status transition fails creates stuck-form UX; recovery path via manual booking advance exists. |
| 2026-03-27 | Claude | DCR-056 | ✅ Signed off. localStorage persistence keyed `daytona-booking-draft:{vehicleId}`. `hasMeaningfulDraft` guard prevents empty-wizard saves. Draft excludes pricing and risk profile (both recomputed fresh on mount). Recovery effect validates vehicleId match, clamps step 1–5, handles corrupt JSON. `clearDraft` resets all in-memory state. Resume banner with timestamp and Discard action in BookingWizard. `ClearBookingDraftOnMount` clears on confirmation page. One fragility noted: key prefix hardcoded in ClearBookingDraftOnMount rather than imported — low risk. |
| 2026-03-27 | Claude | DCR-055 | Conditional pass. 2 patch items: (1) P1: `request-payment` route doesn't guard against duplicate Stripe sessions — missing `stripePaymentLinkUrl` already-set check; double-click creates two sessions and two customer emails (I-024). (2) P2: `AddAdjustmentModal` submit button `loading={isPending}` is bound to parent's `useTransition`, not the modal's own fetch — button is active during the `handleSubmit` fetch window, double-click creates two adjustments (I-025). Known gap accepted: negative correction/credit amounts don't trigger Stripe refunds (future work). All other surfaces correct: service transactions, webhook idempotency, Firestore rules, customer portal visibility, balance computation. |
| 2026-03-27 | Claude | DCR-055 patch | ✅ Both patches verified. I-024: `request-payment` route now returns 409 at line 43 if `adjustment.stripePaymentLinkUrl` is already set — prevents duplicate Stripe sessions before any Stripe call is made. I-025: `AddAdjustmentModal` has `isSubmitting` state, set in `try` block and reset in `finally`; Create button uses `disabled={isSubmitting \|\| isPending}` and `loading={isSubmitting \|\| isPending}`; `useEffect` reset on close also clears `isSubmitting`. DCR-055 fully signed off. |
| 2026-03-27 | Claude | DCR-059 + DCR-060 + DCR-061 | ✅ All three signed off unconditionally. DCR-059: `resumeStep` threaded from URL → page → wizard → provider; clamped to 1–5; `ClearBookingDraftOnMount` now clears both localStorage draft and sessionStorage resume key. DCR-060: Step3 wrapped in `AuthGate` with `step={3}`; `AuthGate` generalized (title/description/step props); `userId` sourced from `auth.currentUser.uid` not booking state; `DocumentUpload` explicit auth guard; Storage rules enforce `request.auth.uid == userId`. DCR-061: `BookingRecoveryPanel` hides when authenticated or no meaningful progress; `continueUrl` encodes `resumeStep`; magic-link-sent page context-aware messaging for booking recovery. |
| 2026-03-27 | Claude | DCR-064 + DCR-066 + DCR-068 | ✅ Signed off. DCR-064: all enums/interfaces match spec; Booking extended with optional insurance fields; BookingStatus union has 4 new values; Firestore rules admin-read/no-client-write on all 4 new collections; 5 indexes present. DCR-066: webhook transitions to `payment_authorized` (not `confirmed`); legacy `pending_verification → confirmed` correctly gated by `isLegacyPendingVerificationBooking`; `availabilityBlockingStatuses` includes all new values; timestamp fields correct. DCR-068 delivered ahead of schedule: `rules.ts` pure functions; channel/package rule matrix correct; `evaluateCoverageDecision` handles all 5 channel/package paths with correct early returns; `buildFallbackVerification` bridges gap until DCR-065 lands. Two patches applied: (1) coverage eval failure in create route now best-effort — returns 201 with created booking and fires monitoring alert instead of false error; (2) `insurance_manual_review` added to `isAdminControlledStatus` — coverage engine re-evaluation no longer overwrites admin-controlled status. |
| 2026-03-27 | Claude | DCR-063 spec | ✅ Complete — `ai/DCR-063-insurance-control-plane.md`. Separates payment/insurance/confirmation into three distinct decisions. 4 new BookingStatus values: `payment_authorized`, `insurance_pending`, `insurance_manual_review`, `insurance_cleared`. Stripe webhook no longer auto-confirms — stops at `payment_authorized`. 5 canonical enums (RentalChannel, InsuranceVerificationStatus, CoverageDecisionStatus, CoverageSource, InsuranceBlockingReason). 3 new Firestore collections (insurance_verifications, coverage_decisions, policy_events). 4 new service files + provider adapter pattern under `lib/insurance/`. Channel-aware coverage rules for direct/platform/partner. Admin override workflow with mandatory reason + full audit trail. Full failure paths for 4 failure modes. Acceptance criteria for DCR-064 through DCR-072. |
| 2026-03-27 | Claude | DCR-062 spec | ✅ Complete — `ai/DCR-062-magic-link-auth-integrity.md`. 4 verified-safe items documented (booking userId always server-authoritative, Storage rules enforce ownership, Step3 userId from currentUser.uid, resumeStep clamped, PI metadata userId cross-check). 4 required fixes: (1) `Secure` cookie flag on `setSessionCookie`/`clearSessionCookie` (closes I-026); (2) rate-limit `complete-registration` at 10/hour/userId; (3) tighten `continueUrl` allowlist to known safe prefixes only; (4) explicit admin-role guard in `complete-registration` so `role: 'customer'` claim is never set when `user.role === 'admin'`. |
| 2026-03-27 | Claude | DCR-062 patch | ✅ All 4 fixes verified. I-026: `setSessionCookie` and `clearSessionCookie` both include `; SameSite=Strict; Secure`. `complete-registration`: rate limit (10/hour/userId) enforced after `requireAuth`; admin guard is `!existing && user.role !== "admin"` (explicit double condition). `normalizeContinueUrl`: allows `/booking/`, `/dashboard` exact, `/dashboard/` prefix, `/auth/`; everything else → `/dashboard`. DCR-062 fully signed off. |
| 2026-03-27 | Claude | DCR-058 | Conditional pass. Full spec implementation: sessionStorage resume path correct (`daytona-booking-resume:{vehicleId}` auto-saved, `?resume=true` → `initialResume={true}` → step forced to 5); token refresh sequence correct (pre-claim → complete-registration → force-refresh → second cookie write); complete-registration idempotent; rate limit 3/email/10min; cross-device email confirmation flow; `continueUrl` open-redirect guard; middleware correctly relaxed for `/booking/[vehicleId]`. One should-fix: `setSessionCookie` missing `; Secure` flag on the cookie (I-026). |
| 2026-03-27 | Claude | DCR-057 spec | ✅ Complete — `ai/DCR-057-magic-link-auth.md`. Firebase `signInWithEmailLink` flow. Server-side link generation via Admin SDK + Resend branded email (not Firebase default). Rate limit: 3 per email per 10 min. `/auth/verify` page handles valid link, cross-device (email re-entry), and expired link. `complete-registration` creates Firestore profile + sets `role: 'customer'` custom claim; idempotent. `AuthGate` wraps Step 5 Payment; shows `EmailEntryStep` if unauthenticated. Booking state serialized to sessionStorage; rehydrated on magic link return via `?resume=true`. |
| 2026-03-27 | Codex | `/api/vehicles/availability` date validation + query hardening | Conditional pass first review — overlap check incomplete (see below). ✅ Signed off after fix. Final state: date validation (NaN guard + inverted-range 400) correct; fleet-wide query simplified to status-only filter (avoids composite index fragility that caused Vercel 500s); in-memory overlap now uses `checkVehicleAvailability` from `lib/utils/dateUtils.ts` — full two-sided check (`requestedStart < bookingEnd && requestedEnd > bookingStart`), consistent with `isVehicleAvailable`. Monitoring wired in catch block with correct severity/alert flags. |
| 2026-03-27 | Codex | Homepage-to-fleet UX context preservation | ✅ Signed off. `HeroSection`: location dropdown + datetime inputs (auto-advance return date to +1 day); navigates to `/fleet?location=&start=&end=`. `VehicleFilters`: date panel with same auto-advance behavior; location selector; active filter count includes dates + location. `FleetCatalog`: URL → filter state round-trip; search context banner when location or dates present; passes dates + location to VehicleGrid → VehicleCard. `VehicleCard`: when dates present, links directly to `/booking/{id}?start=&end=&location=` (intentional direct funnel); shows estimated trip total. `VehicleBookingCard`: seeded from RSC `searchParams` — context preserved on vehicle detail page. |

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
| I-021 | `riskProfileLoading` in `BookingProvider` can get stuck `true` — if dates change while a risk fetch is in-flight, the effect cleanup sets `cancelled = true`, preventing `finally` from resetting the flag; the new effect hits an early return and doesn't reset it either | Open (SHOULD FIX) — reset `riskProfileLoading` to `false` in the early-return paths, not just in `finally` |
| I-022 | Triple risk evaluation per booking creation — route handler calls `evaluateBookingRisk` (4 Firestore reads), route separately calls `getUserDocument` for insurance (already fetched inside risk engine), and `createBooking` calls `evaluateBookingRisk` again — ~8 reads doing work that could be 4 | Open (DEFER) — acceptable at current scale; refactor if latency becomes an issue |
| I-023 | `upsertChecklist` writes checklist then calls `updateBookingStatus` non-atomically — if checklist write succeeds but status transition fails, checklist is `submitted` but booking stays `confirmed`; retry hits "Submitted checklists are read-only"; recovery via manual booking advance in actions panel | Open (SHOULD FIX) — wrap both writes in a Firestore transaction |
| I-024 | `request-payment` route doesn't check whether `adjustment.stripePaymentLinkUrl` is already set — double-clicking "Send payment link" creates two Stripe Checkout sessions and sends two notification emails to the customer; both sessions remain billable | ✅ Closed 2026-03-27 — 409 guard added at line 43 before Stripe session creation |
| I-025 | `AddAdjustmentModal` Create button `loading={isPending}` is bound to parent's `useTransition` (active only during `reloadAdjustments`), not during the modal's own `handleSubmit` fetch — rapid double-click creates two adjustments | ✅ Closed 2026-03-27 — local `isSubmitting` state added; Create button uses `disabled/loading={isSubmitting \|\| isPending}`; reset in `finally` and `useEffect` |
| I-026 | `setSessionCookie` in `lib/auth/clientSession.ts` missing `; Secure` flag — session token can be sent over HTTP without it (mitigated by Vercel HTTPS enforcement, but not best practice) | ✅ Closed 2026-03-27 — `; SameSite=Strict; Secure` added to both `setSessionCookie` and `clearSessionCookie` |
