# DCR-073 — Rental Agreement System

## Problem

The current checkout flow captures terms acceptance via a checkbox in Step 4, but:
- Nothing is persisted to the database — if disputed, there is no server-side record that a specific user accepted specific terms at a specific time.
- The pickup signature in the checklist form is stored on the checklist document, not framed or surfaced as a signed rental agreement.
- There is no terms versioning — if terms change, there is no way to tell which version a past customer agreed to.
- Admin has no single place to confirm "this customer accepted terms and signed at pickup."

---

## Goals

1. Persist a timestamped **consent record** when the customer accepts terms at checkout (Step 4 → Step 5 transition).
2. Persist a **customer signature** at pickup that is explicitly tied to the rental agreement, not just the vehicle condition checklist.
3. Give admin a clear **agreement status view** on the booking detail page.
4. Version the terms content so future changes don't retroactively alter what a customer agreed to.

## Non-Goals

- PDF generation (not needed for v1 — structured JSON record is sufficient).
- DocuSign or external e-signature provider integration.
- Customer-facing agreement download (can be added later).
- Retroactively backfilling existing bookings.

---

## Domain Model

### `RentalAgreement`

Stored in Firestore collection: `rental_agreements`

```
id                  string
bookingId           string
userId              string
status              "pending_consent" | "consented" | "signed" | "voided"
termsVersion        string          e.g. "2026-03"
consentedAt         Date?           set when customer accepts at Step 4
consentIpHint       string?         best-effort, not required
customerSignature   string?         base64 from pickup SignaturePad
signedAt            Date?           set when pickup signature is captured
adminWitnessId      string?         admin who witnessed pickup signature
adminWitnessSignature string?       optional admin countersignature
createdAt           Date
updatedAt           Date
```

### Status Transitions

```
[booking created] → pending_consent
[Step 4 accepted] → consented
[pickup signature] → signed
[admin voids]      → voided
```

A `signed` agreement is immutable — no further mutations allowed.

---

## Terms Versioning

Add `RENTAL_TERMS_VERSION = "2026-03"` to `lib/data/rentalTerms.ts`. Store this on every new agreement record. When terms are updated, bump the version string. Old agreement records retain the version they were created under.

---

## Service Boundaries

### `lib/services/rentalAgreementService.ts`
- `createAgreementForBooking(bookingId, userId)` — creates `pending_consent` record
- `recordConsent(bookingId, userId, ipHint?)` — transitions to `consented`, sets `consentedAt`
- `recordPickupSignature(bookingId, adminId, customerSignature, adminSignature?)` — transitions to `signed`
- `getAgreementForBooking(bookingId)` — returns current record or null
- `voidAgreement(bookingId, adminId, reason)` — sets `voided`, audit logs

### API Routes

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/bookings/[bookingId]/rental-agreement/consent` | customer (owns booking) | Record Step 4 acceptance |
| POST | `/api/admin/bookings/[bookingId]/rental-agreement/sign` | admin | Persist pickup signature |
| GET | `/api/admin/bookings/[bookingId]/rental-agreement` | admin | Read agreement state |

---

## Checkout Integration (Step 4)

When the customer clicks Continue in Step 4 (after accepting terms), fire a POST to `/api/bookings/[bookingId]/rental-agreement/consent` before advancing to Step 5.

**Best-effort** — if the POST fails, log a monitoring alert and allow the customer to continue. Do not block payment over a consent record failure. The booking create route should also attempt to create the agreement record if one doesn't exist (belt-and-suspenders).

---

## Pickup Integration (ChecklistForm)

At pickup, the customer already signs via `SignaturePad`. Wire that same `customerSignature` value into a POST to `/api/admin/bookings/[bookingId]/rental-agreement/sign` when the pickup checklist is submitted. Admin countersignature is optional for v1.

---

## Admin Booking Detail

Add a "Rental Agreement" card to the admin booking detail page showing:
- Agreement status badge (`pending_consent` / `consented` / `signed` / `voided` / no record)
- Terms version on record
- Consented at timestamp
- Signed at timestamp
- Whether admin witness signature is present

---

## Firestore

### Collection: `rental_agreements`

**Rules:**
- No direct client writes — all writes via server-side API routes only
- Admin read access
- Customer cannot read or write directly

**Indexes needed:**
- `(bookingId, status)` — for agreement lookup by booking
- `(userId, createdAt DESC)` — for user agreement history

---

## Acceptance Criteria (DCR-074)

- [ ] Every new booking that reaches Step 4 generates a timestamped consent record before payment
- [ ] Pickup checklist submission persists customer signature to the rental agreement
- [ ] Admin booking detail shows agreement status, terms version, and consent/signed timestamps
- [ ] Terms version is stored per agreement record
- [ ] `status === "signed"` agreements cannot be mutated
- [ ] Missing agreement on existing bookings is handled gracefully (no error, "No agreement on record")
- [ ] TypeScript compiles cleanly, Firestore rules updated, index added
