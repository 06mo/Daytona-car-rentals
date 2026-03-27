# DCR-063 — Insurance Control Plane

**Owner:** Claude
**Status:** Complete
**Depends on:** DCR-050 (ABI coverage alignment), DCR-062 (magic link auth integrity)
**Blocks:** DCR-064 through DCR-072

---

## Objective

Define a server-authoritative insurance control plane that decouples payment success from booking confirmation, normalises insurance verification across all coverage sources, and supports direct, platform, and partner rental channels without mixing their logic together.

The current system conflates three distinct decisions into one:

1. **Payment** — has the customer paid a deposit?
2. **Insurance** — does valid coverage exist for this rental?
3. **Confirmation** — can Daytona legally release the vehicle?

This spec separates them cleanly.

---

## Non-Goals

- This spec does **not** define a live insurance API integration (that is DCR-070).
- This spec does **not** replace existing protection package pricing logic.
- This spec does **not** add customer-facing insurance dashboards or self-service policy management.
- This spec does **not** introduce PDF generation, e-signature workflows, or contract management.
- This spec does **not** change Stripe payment flows — only what happens after payment.
- This spec does **not** require immediate data migration of historical bookings to the new status model; backward compatibility is required.

---

## Domain Concepts

### Insurance Verification

A record that captures the result of evaluating whether a renter's insurance (or a managed coverage source) satisfies the requirements for a specific booking. Created per-booking, not per-user. A user may have multiple verification attempts across multiple bookings, and a booking may have multiple verification attempts over time.

Stored in: `insurance_verifications/{verificationId}` (top-level collection, bookingId-indexed).

### Coverage Decision

The authoritative, server-computed judgement of whether a booking has sufficient coverage to proceed to confirmation. Produced by the coverage decision engine after one or more insurance verifications. A new decision replaces the previous one — only the latest decision is operationally relevant.

Stored in: `coverage_decisions/{decisionId}` (top-level collection, bookingId-indexed).

### Coverage Source

Which insurance policy is expected to be primary for this booking's rental period. This is a derived field from the coverage decision, not a customer selection. It reflects the actual coverage source, not the intended one.

### Rental Channel

How the booking originated. This controls which compliance rules apply and which coverage source is valid.

- `direct` — customer booked via daytona-car-rentals.com
- `platform` — booking originated from an approved third-party platform (e.g. marketplace or aggregator) and carries a platform trip ID
- `partner` — booking originated from a partner referral with a valid partner record; partner has declared coverage responsibility

### Provider Adapter

An interface that abstracts a single external insurance/verification vendor. Business logic consumes only normalised outputs from the adapter. Raw vendor payloads are retained for audit only.

### Manual Review

A state where automated decision is not possible and a human admin must evaluate the booking before it can proceed. This is a legitimate terminal-ish state, not an error state.

### Override

An admin action that clears a blocking insurance condition and forces a coverage decision to `approved`, with a mandatory typed reason and full audit trail. Overrides cannot be silent.

---

## Canonical Enums

```ts
// types/insurance.ts

export type RentalChannel = "direct" | "platform" | "partner";

export type InsuranceVerificationStatus =
  | "unsubmitted"       // no attempt made yet
  | "pending"           // verification in progress (awaiting document review or provider response)
  | "verified"          // coverage confirmed as valid for this booking
  | "rejected"          // coverage explicitly failed validation
  | "expired"           // verification was valid but policy expiry date has passed
  | "unverifiable";     // not enough information to make a determination; escalates to manual review

export type CoverageDecisionStatus =
  | "approved"          // booking may proceed to confirmed
  | "manual_review"     // requires admin action before booking can proceed
  | "rejected";         // booking cannot be confirmed; coverage gap must be resolved

export type CoverageSource =
  | "renter_policy"     // renter's own personal auto insurance (basic package)
  | "embedded_policy"   // Daytona-sourced coverage via provider adapter (standard/premium)
  | "platform_policy"   // coverage declared by originating platform
  | "partner_policy"    // coverage declared by referring partner
  | "none";             // no coverage source resolved
```

### Normalised Rejection / Blocking Reasons

```ts
export type InsuranceBlockingReason =
  | "policy_not_active"
  | "name_mismatch"
  | "liability_limits_too_low"
  | "rental_use_excluded"
  | "peer_to_peer_excluded"
  | "commercial_use_excluded"
  | "document_unreadable"
  | "missing_required_fields"
  | "coverage_expired"
  | "no_document_on_file"
  | "provider_unavailable"
  | "platform_trip_id_missing"
  | "partner_not_active"
  | "partner_coverage_not_declared"
  | "admin_rejected"
  | "manual_review_required";
```

---

## Data Model

### InsuranceVerification

```ts
export interface InsuranceVerification {
  id: string;
  bookingId: string;
  userId: string;
  vehicleId: string;
  rentalChannel: RentalChannel;
  protectionPackage: "basic" | "standard" | "premium";

  status: InsuranceVerificationStatus;
  blockingReasons: InsuranceBlockingReason[];

  // Normalised fields from document review or provider response
  carrierName?: string;
  namedInsuredMatch?: boolean;            // renter name matches policy
  effectiveDate?: Date;
  expirationDate?: Date;
  hasComprehensiveCollision?: boolean;
  liabilityLimitsCents?: number;
  rentalUseConfirmed?: boolean;

  // Source tracking
  verifiedBy: "admin" | "provider" | "system";
  providerId?: string;                    // adapter ID if provider-verified
  providerReferenceId?: string;           // provider's internal ID for the check
  documentId?: string;                    // linked UserDocument if applicable

  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}
```

**Firestore path:** `insurance_verifications/{verificationId}`
**Index:** `bookingId ASC, createdAt DESC`

---

### CoverageDecision

```ts
export interface CoverageDecision {
  id: string;
  bookingId: string;
  userId: string;
  rentalChannel: RentalChannel;
  protectionPackage: "basic" | "standard" | "premium";
  riskLevel?: string;

  status: CoverageDecisionStatus;
  coverageSource: CoverageSource;
  blockingReasons: InsuranceBlockingReason[];
  approvalReasons?: string[];             // human-readable reasons for approved decisions

  // Override tracking
  overrideApplied: boolean;
  overrideBy?: string;                    // admin userId
  overrideReason?: string;               // required if overrideApplied
  overrideAt?: Date;

  // Linked verification
  insuranceVerificationId?: string;

  evaluatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

**Firestore path:** `coverage_decisions/{decisionId}`
**Index:** `bookingId ASC, evaluatedAt DESC`

---

### PolicyEvent

```ts
export interface PolicyEvent {
  id: string;
  bookingId: string;
  userId: string;
  type: PolicyEventType;
  status: "attempted" | "succeeded" | "failed";
  coverageSource: CoverageSource;
  providerId?: string;
  providerReferenceId?: string;
  errorMessage?: string;
  createdAt: Date;
}

export type PolicyEventType =
  | "verification_initiated"
  | "verification_resolved"
  | "coverage_decision_evaluated"
  | "policy_bound"
  | "policy_bind_failed"
  | "policy_cancelled"
  | "override_applied";
```

**Firestore path:** `policy_events/{eventId}`
**Index:** `bookingId ASC, createdAt DESC`

---

### ClaimsEvidencePackage (metadata type)

```ts
export interface ClaimsEvidencePackage {
  id: string;
  bookingId: string;
  generatedAt: Date;
  generatedBy: string;                    // admin userId

  bookingSnapshot: Record<string, unknown>;
  renterSnapshot: Record<string, unknown>;
  vehicleSnapshot: Record<string, unknown>;
  protectionSummary: Record<string, unknown>;
  insuranceVerificationSummary: Record<string, unknown> | null;
  coverageDecisionSummary: Record<string, unknown> | null;
  pickupChecklistRef: string | null;
  dropoffChecklistRef: string | null;
  signatureRefs: string[];
  checklistPhotoRefs: string[];
  adjustmentsSummary: Record<string, unknown>[];
  paymentSummary: Record<string, unknown>;
  timelineSummary: Record<string, unknown>[];
  auditEventRefs: string[];
}
```

---

### Booking Document Extensions

The following fields are added to the `Booking` type (backward-compatible additions):

```ts
// New fields on Booking (all optional for backward compatibility)
rentalChannel?: RentalChannel;                    // defaults to "direct" if absent
coverageDecisionStatus?: CoverageDecisionStatus;
coverageSource?: CoverageSource;
insuranceVerificationStatus?: InsuranceVerificationStatus;
insuranceBlockingReasons?: InsuranceBlockingReason[];
insuranceClearedAt?: Date;
insuranceReviewedAt?: Date;
insuranceOverrideApplied?: boolean;
paymentAuthorizedAt?: Date;
platformTripId?: string;                          // platform channel only
```

The `partnerId` field already exists on `Booking` — no change needed.

---

## Booking Status Lifecycle Changes

### New Statuses

The existing `BookingStatus` union gains four new values:

```ts
export type BookingStatus =
  // --- existing ---
  | "pending_verification"
  | "pending_payment"
  | "confirmed"
  | "active"
  | "completed"
  | "cancelled"
  | "payment_failed"
  // --- new ---
  | "payment_authorized"        // deposit collected; insurance check not yet started or in progress
  | "insurance_pending"         // insurance verification actively in progress
  | "insurance_manual_review"   // flagged for admin review before can proceed
  | "insurance_cleared";        // coverage decision approved; ready for confirmation
```

### State Transition Table

| From | To | Trigger | Who |
|---|---|---|---|
| `pending_payment` | `payment_authorized` | Stripe webhook: `payment_intent.succeeded` | System (webhook) |
| `payment_authorized` | `insurance_pending` | Coverage decision engine begins evaluation | System |
| `payment_authorized` | `insurance_manual_review` | Risk level high or channel requires manual review | System |
| `insurance_pending` | `insurance_cleared` | Coverage decision resolves to `approved` | System |
| `insurance_pending` | `insurance_manual_review` | Verification unverifiable or ambiguous | System |
| `insurance_pending` | `payment_authorized` | Verification rejected — awaiting renter action | System |
| `insurance_manual_review` | `insurance_cleared` | Admin approves or applies override | Admin |
| `insurance_manual_review` | `cancelled` | Admin rejects — no valid coverage path | Admin |
| `insurance_cleared` | `confirmed` | System auto-confirms or admin confirms | System / Admin |
| `confirmed` | `active` | Pickup checklist submitted | Admin |
| `active` | `completed` | Dropoff checklist submitted | Admin |
| Any non-terminal | `cancelled` | Admin cancel or customer cancel (within policy) | Admin / Customer |

**Preserved transitions (no change):**

- `pending_verification → pending_payment` — document upload/approval still gates payment
- `confirmed → active` — pickup checklist still required
- `active → completed` — dropoff checklist still required
- Refund/cancel logic unchanged

**Critical rule:** `confirmed` must only be reachable from `insurance_cleared`. The Stripe webhook must NOT transition directly to `confirmed` — that path is removed.

### Backward Compatibility

- All existing bookings without the new fields default to `rentalChannel: "direct"`.
- Existing bookings in `confirmed` or later states are not re-processed through the insurance gate.
- The admin state machine must still support existing status values to handle in-flight bookings.

---

## Service Boundaries

### Folder Structure

```
lib/
  insurance/
    rules.ts                        # pure channel/package/risk rule evaluation (no I/O)
    evaluateCoverage.ts             # main coverage decision function
    normalize.ts                    # normalise verification inputs → InsuranceVerification fields
    providers/
      types.ts                      # ProviderAdapter interface contract
      embedded.ts                   # stub / mock implementation for dev/testing
      axle.ts                       # (DCR-070) first real provider adapter

  services/
    insuranceVerificationService.ts  # CRUD + lifecycle for InsuranceVerification records
    coverageDecisionService.ts       # evaluate + persist CoverageDecision; drive booking transitions
    claimsEvidenceService.ts         # assemble evidence package (read-only, admin-only)
```

### Service Responsibilities

**`lib/insurance/rules.ts`** — pure functions only, no Firestore, no network:
- `getRequiredCoverageForChannel(channel, protectionPackage, riskLevel)` → required sources + conditions
- `evaluateVerificationAgainstRules(verification, rules)` → blocking reasons or empty array
- `shouldAutoApprove(channel, protectionPackage, verification)` → boolean
- `shouldEscalateToManualReview(channel, protectionPackage, riskLevel, verification)` → boolean

**`lib/insurance/evaluateCoverage.ts`** — orchestration, calls rules + services:
- `evaluateCoverageDecision(input)` → `{ status, coverageSource, blockingReasons, approvalReasons }`
- Persists `CoverageDecision` and `PolicyEvent` records
- Drives booking status transition

**`lib/services/insuranceVerificationService.ts`** — Firestore I/O for verification records:
- `createInsuranceVerificationRequest(bookingId, userId, ...)` → creates `pending` record
- `finalizeInsuranceVerification(verificationId, result)` → updates record, fires decision engine
- `getLatestInsuranceVerificationForBooking(bookingId)` → latest record
- `summarizeInsuranceVerificationForBooking(bookingId)` → safe summary for admin/customer display

**`lib/services/coverageDecisionService.ts`** — Firestore I/O for decision records:
- `getLatestCoverageDecisionForBooking(bookingId)` → latest decision
- `persistCoverageDecision(input)` → writes decision, logs PolicyEvent
- `applyAdminOverride(bookingId, adminUserId, reason)` → mutates decision, logs override event, triggers booking transition

**`lib/services/claimsEvidenceService.ts`** — read-only assembly:
- `generateClaimsEvidencePackage(bookingId, adminUserId)` → `ClaimsEvidencePackage`

---

## Channel-Aware Coverage Logic

### Direct Channel

```
IF direct + basic:
  REQUIRE: InsuranceVerification.status === "verified"
  REQUIRE: no blocking reasons remain
  coverageSource = "renter_policy"
  ELSE: escalate to manual_review if unverifiable, or reject if rejected

IF direct + standard:
  PREFER: InsuranceVerification.status === "verified" (renter_policy primary)
  OR:     embedded_policy bind succeeds (embedded_policy primary)
  OR:     no live provider yet → escalate to manual_review
  coverageSource = "renter_policy" | "embedded_policy" | manual pathway

IF direct + premium:
  SAME AS standard logic
  ADDITIONAL: if riskLevel === "high", must escalate to manual_review even with verified renter policy
  coverageSource = "renter_policy" | "embedded_policy" | manual pathway
```

### Platform Channel

```
REQUIRE: platformTripId is present and non-empty
REQUIRE: booking.partnerId references an active partner record (or platform metadata validated)
coverageSource = "platform_policy"
IF platformTripId missing → reject immediately with "platform_trip_id_missing"
IF platform metadata invalid → escalate to manual_review
```

### Partner Channel

```
REQUIRE: booking.partnerId references an active partner record
REQUIRE: partner record has coverageResponsibility declared
coverageSource = "partner_policy"
IF partner not found or inactive → reject with "partner_not_active"
IF partner found but no coverage responsibility → reject with "partner_coverage_not_declared"
```

---

## Admin Override Workflow

**Who can override:** Users with `role === "admin"` only. Server-side enforced.

**Required fields:**
- `overrideReason: string` — typed, min 10 characters, required
- `adminUserId` — from verified Firebase ID token, never trusted from request body

**Effect on booking state:**
1. `CoverageDecision.overrideApplied = true`, `overrideBy`, `overrideReason`, `overrideAt` set
2. `CoverageDecision.status` set to `approved`
3. `CoverageDecision.coverageSource` set to the appropriate source for the channel + package (or `renter_policy` if unclear)
4. Booking transitions: `insurance_manual_review → insurance_cleared → confirmed`
5. `Booking.insuranceOverrideApplied = true`

**Audit requirements:**
- `PolicyEvent` created: `type: "override_applied"`, `status: "succeeded"`, with overrideReason in context
- `AuditEvent` logged via existing `auditService.logAuditEvent(...)`: event type `"insurance_override_applied"`, actor = adminUserId, bookingId, reason
- `Booking.adminNotes` updated with a timestamped override note (appended, not replaced)

**UI requirement:** The override button must show a confirmation modal with a required reason field. The button is disabled until a reason of sufficient length is provided.

---

## Failure Paths

### Payment succeeded but insurance failed

**Scenario:** Stripe webhook fires `payment_intent.succeeded`. Coverage decision engine runs and returns `rejected`.

**Handling:**
1. Booking transitions to `payment_authorized` (deposit captured).
2. Coverage decision records `rejected`.
3. Booking stays at `payment_authorized` — NOT cancelled.
4. Admin is notified (monitoring alert + admin queue flag).
5. Admin options: contact renter, trigger re-verification, apply override, or cancel + refund.
6. Customer notification: "Your deposit has been collected. We are reviewing your booking — you'll hear from us within [X hours]."
7. Do NOT auto-cancel — the renter may be able to resolve the issue.

### Insurance provider unavailable

**Scenario:** `evaluateCoverageDecision` calls provider adapter; adapter returns a timeout or error.

**Handling:**
1. `PolicyEvent` logged: `type: "verification_initiated"`, `status: "failed"`, `errorMessage`.
2. `InsuranceVerification.status = "unverifiable"` with `blockingReasons: ["provider_unavailable"]`.
3. `CoverageDecision.status = "manual_review"`.
4. Booking transitions to `insurance_manual_review`.
5. Monitoring alert fired with `severity: "error"`.
6. Never silently falls through to `approved`.

### Customer uploaded invalid insurance (basic package)

**Scenario:** Admin reviews uploaded insurance document and rejects it.

**Handling:**
1. `InsuranceVerification.status = "rejected"` with normalised blocking reasons.
2. `CoverageDecision.status = "rejected"` (or `manual_review` if re-upload is being awaited).
3. Booking stays at `insurance_pending` or reverts to `payment_authorized`.
4. Customer notified: document rejected, must re-upload.
5. New verification attempt may be created when customer re-uploads.

### Booking times out waiting for insurance clearance

**Scenario:** Booking reaches pickup date with coverage decision still `manual_review` or `insurance_pending`.

**Handling:**
- This is an **operational** issue, not an automated one.
- Admin should receive an alert (via existing monitoring) when a booking with status `insurance_manual_review` or `insurance_pending` is within 24 hours of its `startDate`.
- Admin must resolve (override, escalate, or cancel) before vehicle release.
- No automated cancellation — admin retains control.
- Future work: cron job to flag these (not in this spec's scope).

---

## API Routes

### `POST /api/insurance/verify-renter-policy` (DCR-065)

Create or re-trigger a verification attempt for a booking.

**Auth:** Customer (owns booking) or admin.
**Rate limited:** yes.

---

### `GET /api/admin/bookings/[bookingId]/insurance` (DCR-067)

Fetch the latest insurance verification summary and coverage decision for a booking.

**Auth:** Admin only.

---

### `POST /api/admin/bookings/[bookingId]/insurance/override` (DCR-067)

Apply an admin override to the coverage decision.

**Auth:** Admin only.
**Required body:** `{ reason: string }`

---

### `GET /api/admin/bookings/[bookingId]/claims-evidence` (DCR-071)

Return the full claims evidence package.

**Auth:** Admin only. Read-only. Never mutates state.

---

## Admin UI — InsuranceReviewPanel

Displayed in the admin booking detail page. Visible when any insurance-related booking status is present, or always visible in the DCR-067 implementation.

```
┌─────────────────────────────────────────────────────────────────┐
│  Insurance & Coverage                                           │
│                                                                 │
│  Rental Channel:       Direct                                   │
│  Protection Package:   Basic                                    │
│  Risk Level:           Medium                                   │
│                                                                 │
│  ── Verification ────────────────────────────────────────────── │
│  Status:               Pending                                  │
│  Carrier:              GEICO                                    │
│  Named Insured Match:  ✓ Yes                                    │
│  Effective:            2025-01-01 → 2026-01-01                  │
│  Comp/Collision:       ✓ Present                                │
│  Blocking Reasons:     —                                        │
│                                                                 │
│  ── Coverage Decision ───────────────────────────────────────── │
│  Decision:             Manual Review                            │
│  Coverage Source:      —                                        │
│  Blocking Reasons:     manual_review_required                   │
│                                                                 │
│  ── Actions ─────────────────────────────────────────────────── │
│  [Mark Verified]  [Reject]  [Send to Manual Review]             │
│  [Apply Override ▼] (requires typed reason)                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Notification Changes

### New notifications required (DCR-065 / DCR-067)

| Event | Recipient | Channel |
|---|---|---|
| `insurance_pending` entered | Admin queue | Monitoring / admin flag |
| `insurance_manual_review` entered | Admin | Email alert |
| Insurance rejected (customer re-upload required) | Customer | Email |
| Coverage cleared / booking confirmed | Customer | Email (existing `booking_confirmed`) |
| Provider unavailable | Admin | Monitoring alert (severity: error) |

Reuse existing `notificationService` and `reportMonitoringEvent` patterns.

---

## Firestore Security Rules

```firestore
match /insurance_verifications/{verificationId} {
  // No client-authoritative writes
  allow read: if isAdmin();
  allow write: if false;   // server-side only via Admin SDK
}

match /coverage_decisions/{decisionId} {
  allow read: if isAdmin();
  allow write: if false;   // server-side only via Admin SDK
}

match /policy_events/{eventId} {
  allow read: if isAdmin();
  allow write: if false;   // server-side only via Admin SDK
}
```

Customers access insurance summaries only via controlled API routes, not direct Firestore reads.

---

## Firestore Indexes

```json
{ "collectionGroup": "insurance_verifications",
  "fields": [
    { "fieldPath": "bookingId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{ "collectionGroup": "coverage_decisions",
  "fields": [
    { "fieldPath": "bookingId", "order": "ASCENDING" },
    { "fieldPath": "evaluatedAt", "order": "DESCENDING" }
  ]
},
{ "collectionGroup": "coverage_decisions",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "evaluatedAt", "order": "DESCENDING" }
  ]
},
{ "collectionGroup": "policy_events",
  "fields": [
    { "fieldPath": "bookingId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

---

## Acceptance Criteria by Task

### DCR-064 — Types + Firestore schema
- [ ] All enums and interfaces from this spec exist in `types/insurance.ts`
- [ ] `Booking` type extended with optional insurance fields
- [ ] `BookingStatus` union includes the 4 new statuses
- [ ] Firestore rules added for 3 new collections (no client write)
- [ ] Indexes added for all 3 new collections
- [ ] `npx tsc --noEmit` passes; existing booking flow unaffected

### DCR-065 — Renter policy verification
- [ ] `insuranceVerificationService` implements all 4 required service functions
- [ ] `lib/insurance/normalize.ts` maps document review result → normalised verification fields
- [ ] `POST /api/insurance/verify-renter-policy` is auth-guarded, rate-limited, ownership-checked
- [ ] Route returns normalised summary — no raw provider payload
- [ ] Rejected and expired verifications are distinguishable from unsubmitted
- [ ] Machine-readable blocking reasons persisted

### DCR-066 — Booking status split
- [ ] Stripe webhook no longer auto-transitions to `confirmed` — transitions to `payment_authorized`
- [ ] New status values present in `BookingStatus`
- [ ] State machine transition guards updated
- [ ] Admin and customer booking detail pages handle new statuses without breaking
- [ ] `paymentAuthorizedAt` written when `payment_authorized` is entered
- [ ] Customer sees a clear message when paid but insurance pending

### DCR-067 — Admin insurance review panel
- [ ] `InsuranceReviewPanel` shows all fields listed in the UI section above
- [ ] All 4 actions (mark verified, reject, send to manual review, override) functional
- [ ] Override requires typed reason; button disabled without it
- [ ] Every action produces an audit log entry
- [ ] Panel integrated into admin booking detail page

### DCR-068 — Coverage decision engine
- [ ] `evaluateCoverageDecision` handles all 5 channel/package combinations
- [ ] Always returns exactly one status and one coverageSource
- [ ] Always returns machine-readable reasons
- [ ] No null/ambiguous decision state possible
- [ ] Business logic is in `rules.ts` (pure) — not scattered in route handlers

### DCR-069 — Provider adapter interface
- [ ] `ProviderAdapter` interface defined in `lib/insurance/providers/types.ts`
- [ ] Mock/stub implementation usable in dev without real credentials
- [ ] Business logic consumes only normalised adapter output
- [ ] Provider failure degrades to `manual_review`, never silent pass

### DCR-070 — First provider integration
- [ ] Real adapter behind the `ProviderAdapter` interface
- [ ] Normalised outputs stored; raw payloads audit-only
- [ ] Provider unavailable → `manual_review`, not `approved`
- [ ] Env-var driven; local dev usable without credentials

### DCR-071 — Claims evidence package
- [ ] `generateClaimsEvidencePackage` assembles all evidence sources listed in the spec
- [ ] Missing sub-components (e.g. no dropoff checklist) handled gracefully
- [ ] Admin-only, read-only route
- [ ] Returns structured JSON with `generatedAt`
- [ ] Does not mutate booking state

### DCR-072 — Channel compliance rules
- [ ] Direct, platform, and partner rules enforced as separate branches (not mixed)
- [ ] Platform: requires `platformTripId`
- [ ] Partner: requires active partner record with declared coverage responsibility
- [ ] Admin booking detail shows channel, external trip ID, partner name, coverage source
- [ ] Pre-DCR-063 bookings (no `rentalChannel` set) default to `direct` without errors

---

## Files to Create / Modify

| File | Action | Task |
|---|---|---|
| `types/insurance.ts` | Create | DCR-064 |
| `types/booking.ts` | Modify — extend Booking + BookingStatus | DCR-064 |
| `types/index.ts` | Modify — re-export insurance types | DCR-064 |
| `firestore.rules` | Modify — add 3 new collection rules | DCR-064 |
| `firestore.indexes.json` | Modify — add 4 new indexes | DCR-064 |
| `lib/insurance/rules.ts` | Create | DCR-068 |
| `lib/insurance/evaluateCoverage.ts` | Create | DCR-068 |
| `lib/insurance/normalize.ts` | Create | DCR-065 |
| `lib/insurance/providers/types.ts` | Create | DCR-069 |
| `lib/insurance/providers/embedded.ts` | Create (mock) | DCR-069 |
| `lib/insurance/providers/axle.ts` | Create (first real) | DCR-070 |
| `lib/services/insuranceVerificationService.ts` | Create | DCR-065 |
| `lib/services/coverageDecisionService.ts` | Create | DCR-068 |
| `lib/services/claimsEvidenceService.ts` | Create | DCR-071 |
| `lib/services/bookingService.ts` | Modify — new status transitions | DCR-066 |
| `lib/stripe/webhooks.ts` | Modify — remove auto-confirm; write paymentAuthorizedAt | DCR-066 |
| `lib/security/rateLimit.ts` | Modify — add verifyRenterPolicy policy | DCR-065 |
| `app/api/insurance/verify-renter-policy/route.ts` | Create | DCR-065 |
| `app/api/admin/bookings/[bookingId]/insurance/route.ts` | Create | DCR-067 |
| `app/api/admin/bookings/[bookingId]/insurance/override/route.ts` | Create | DCR-067 |
| `app/api/admin/bookings/[bookingId]/claims-evidence/route.ts` | Create | DCR-071 |
| `components/admin/InsuranceReviewPanel.tsx` | Create | DCR-067 |
| `app/(admin)/admin/bookings/[bookingId]/page.tsx` | Modify — add InsuranceReviewPanel | DCR-067 |
| Customer booking detail page | Modify — handle new insurance-pending statuses | DCR-066 |
