# DCR-045 — Protection Package System

**Owner:** Claude
**Status:** Complete
**Blocks:** DCR-046, DCR-047, DCR-048, DCR-049

---

## Overview

Protection packages replace the standalone `cdw` extra with a structured, tiered coverage system. Every booking must carry exactly one protection package. The package choice affects:

- Daily pricing (protection fee added to booking total)
- Deposit amount (premium tier reduces deposit)
- Insurance requirement (basic tier requires renter's own insurance on file)
- Stripe metadata (package included in payment intent)

---

## Protection Tiers

### Basic — "Renter's Own Coverage"

| Attribute | Value |
|---|---|
| `packageId` | `'basic'` |
| Display name | "Basic — Use My Own Insurance" |
| Daily fee | $0/day (no protection surcharge) |
| CDW | **Not included** — renter's own policy applies |
| Liability cap | Renter's policy deductible (not our concern) |
| Deposit modifier | **1.0×** (full standard deposit) |
| Insurance required | **YES** — valid insurance card must be on file |
| Best for | Customers whose personal auto policy covers rental vehicles |

> **Insurance requirement:** The renter must have an approved OR pending insurance card document (`users/{userId}/documents/insurance_card`) with status `'approved'` or `'pending'`. If the document is missing or `'rejected'`, booking creation is blocked server-side.

---

### Standard — "Standard Protection"

| Attribute | Value |
|---|---|
| `packageId` | `'standard'` |
| Display name | "Standard Protection" |
| Daily fee | Admin-configurable (default: **$25/day**) |
| CDW | **Included** — $500 deductible on damage/theft |
| Liability | Included up to state minimum |
| Roadside | Basic roadside assistance |
| Deposit modifier | **1.0×** (standard deposit; CDW covers damage risk) |
| Insurance required | **No** |
| Best for | Customers without rental coverage on their personal policy |

---

### Premium — "Full Protection"

| Attribute | Value |
|---|---|
| `packageId` | `'premium'` |
| Display name | "Full Protection" |
| Daily fee | Admin-configurable (default: **$45/day**) |
| CDW | **Included** — $0 deductible (full waiver) |
| Theft protection | **Included** — $0 deductible |
| Personal Accident Insurance | Included |
| Roadside | 24/7 premium roadside assistance |
| Deposit modifier | **0.5×** (reduced deposit — full coverage warrants lower hold) |
| Insurance required | **No** |
| Best for | Maximum peace of mind; no out-of-pocket exposure |

---

## Migration: CDW Extra Deprecation

The existing `cdw: boolean` field in `BookingExtras` is **superseded** by protection packages.

- Standard and Premium already include CDW-equivalent coverage.
- Basic does not include CDW but uses the renter's own policy.
- The `cdw` extra toggle **must be removed** from Step 2 (Extras) UI when protection packages are live.
- `cdw` should remain in the `BookingExtras` type for backward compatibility with historical bookings, but will always be `false` on new bookings created after this feature ships.

---

## Data Model Changes

### Firestore: `protection_pricing/current`

Admin-editable pricing document (mirrors `extras_pricing/current` pattern).

```ts
interface ProtectionPricing {
  standard: number    // USD cents per day (e.g. 2500 = $25.00)
  premium: number     // USD cents per day (e.g. 4500 = $45.00)
  // basic is always 0 — no field needed
  updatedAt: Timestamp
}
```

**Firestore path:** `protection_pricing/current`
**Security rules:** public read, admin write (same as `extras_pricing`).

---

### TypeScript: `ProtectionPackage` type

```ts
// types/protection.ts

export type ProtectionPackageId = 'basic' | 'standard' | 'premium'

export interface ProtectionPackage {
  id: ProtectionPackageId
  name: string
  description: string
  dailyFee: number           // USD cents; 0 for basic
  depositModifier: number    // 1.0 = full, 0.5 = half
  cdwIncluded: boolean
  requiresInsurance: boolean
}

export interface ProtectionPricing {
  standard: number           // USD cents per day
  premium: number            // USD cents per day
  updatedAt: Timestamp
}
```

---

### `Booking` schema additions

Add to `bookings/{bookingId}`:

```ts
interface Booking {
  // ... existing fields ...

  protectionPackage: ProtectionPackageId   // 'basic' | 'standard' | 'premium'
  // REQUIRED — every new booking must have this set
}
```

Add to `BookingPricing`:

```ts
interface BookingPricing {
  // ... existing fields ...
  protectionAmount: number   // USD cents — protection fee × totalDays (0 for basic)
  totalAmount: number        // baseAmount + extrasAmount + protectionAmount
  depositAmount: number      // vehicle.depositAmount × depositModifier
}
```

> **Note:** `depositAmount` is now calculated as `vehicle.depositAmount × depositModifier` rounded to nearest cent. For basic and standard, modifier = 1.0 (no change). For premium, modifier = 0.5.

---

## Insurance Validation Rules

### Server-side enforcement (DCR-047)

On `POST /api/bookings/create`, before writing the booking:

```
if booking.protectionPackage === 'basic':
  fetch users/{userId}/documents/insurance_card
  if document missing:
    return 422 { error: 'insurance_required', message: 'Basic protection requires a valid insurance card on file.' }
  if document.status === 'rejected':
    return 422 { error: 'insurance_rejected', message: 'Your insurance card was rejected. Please upload a valid card or select a different protection package.' }
  // 'pending' and 'approved' are both acceptable — admin reviews later
```

### Client-side enforcement (DCR-047)

- In Step 3 (Documents) or the protection package selection step: if user selects `basic`, the insurance upload zone becomes **required** (blocking the "Continue" button if not uploaded).
- If the user already has an approved or pending insurance card on file, show a green "Insurance on file ✓" indicator and allow proceeding.
- If the user selects `standard` or `premium`, insurance upload becomes optional (existing behavior preserved).

---

## Pricing Calculation

Updated `computeBookingPricing` signature:

```ts
export function computeBookingPricing(
  vehicle: Vehicle,
  extrasPricing: ExtrasPricing,
  protectionPricing: ProtectionPricing,
  extras: BookingExtras,
  protectionPackage: ProtectionPackageId,
  startDate: string,
  endDate: string,
): BookingPricing {
  const totalDays = differenceInCalendarDays(parseISO(endDate), parseISO(startDate))
  const baseAmount = vehicle.dailyRate * totalDays

  const extrasAmount =
    (extras.additionalDriver ? extrasPricing.additionalDriver * totalDays : 0) +
    (extras.gps              ? extrasPricing.gps * totalDays : 0) +
    (extras.childSeat        ? extrasPricing.childSeat * totalDays : 0)
    // Note: cdw extra removed; protection package covers this

  const protectionDailyFee =
    protectionPackage === 'premium' ? protectionPricing.premium :
    protectionPackage === 'standard' ? protectionPricing.standard :
    0  // basic

  const protectionAmount = protectionDailyFee * totalDays

  const depositModifier = protectionPackage === 'premium' ? 0.5 : 1.0
  const depositAmount = Math.round(vehicle.depositAmount * depositModifier)

  return {
    dailyRate: vehicle.dailyRate,
    totalDays,
    baseAmount,
    extrasAmount,
    protectionAmount,
    depositAmount,
    totalAmount: baseAmount + extrasAmount + protectionAmount,
  }
}
```

---

## Booking Flow Integration (DCR-046)

### Placement

Protection package selection goes at the **top of Step 2 (Extras)**, before the add-on extras toggles. It is a required selection (default: `'standard'`).

### UI Pattern

Radio card group — one card per tier, clearly differentiated:

```
┌─────────────────────────────────────────────────────────────────┐
│  Protection Package  (required)                                  │
│                                                                  │
│  ○  Basic — Use My Own Insurance              $0/day            │
│     Your personal policy covers the rental.                     │
│     Requires insurance card on file.                            │
│                                                                  │
│  ●  Standard Protection            (recommended)   +$25/day    │  ← default
│     CDW included. $500 deductible on damage.                    │
│     No personal insurance needed.                               │
│                                                                  │
│  ○  Full Protection                            +$45/day        │
│     $0 deductible. Personal accident + roadside included.       │
│     Reduced deposit.                                            │
└─────────────────────────────────────────────────────────────────┘
```

- Selecting `basic` shows an inline note: "Your insurance card is required. You can upload it in the Documents step."
- Selecting `premium` shows an inline note: "Your deposit is reduced to 50% of the standard amount."
- Package selection immediately updates `pricing.protectionAmount` and `pricing.depositAmount` in BookingContext.

### BookingContext additions

```ts
interface BookingState {
  // ... existing fields ...
  protectionPackage: ProtectionPackageId   // default: 'standard'
}

interface BookingContextValue {
  // ... existing methods ...
  setProtectionPackage: (pkg: ProtectionPackageId) => void
}
```

---

## Step 3 — Documents: Conditional Insurance Requirement

When `protectionPackage === 'basic'`:

- Insurance card upload zone changes from "optional" to **required**.
- If insurance is missing, the "Continue" button is disabled with tooltip: "Upload your insurance card to continue with Basic protection."
- If insurance is already on file (any status other than `rejected`), show "Insurance on file ✓" and allow proceeding.

When `protectionPackage === 'standard'` or `'premium'`:
- Insurance upload zone remains optional (existing behavior).

---

## Step 4 — Review: Display Protection Package

Add a "Protection" line to the order summary:

```
Protection:   Standard Protection               $125.00
              (CDW included · $500 deductible)

Deposit:      $150.00  ← note: reduced to $75 if premium selected
```

---

## Admin Display (DCR-049)

In admin booking detail and customer portal, show:

```
Protection Package:  Standard Protection
                     CDW included · $500 deductible · $25/day
Protection Total:    $125.00
```

---

## Stripe Metadata (DCR-048)

Add to `paymentIntents.create()` metadata:

```ts
metadata: {
  // ... existing fields ...
  protectionPackage: bookingData.protectionPackage,
  protectionAmount: String(pricing.protectionAmount),
}
```

The Stripe charge amount remains `vehicle.depositAmount × depositModifier` (deposit only). The `protectionAmount` is part of the total recorded in metadata, collected at pickup with the remaining balance.

---

## Firestore Security Rules Additions

```firestore
// Protection pricing — public read, admin write
match /protection_pricing/{doc} {
  allow read: if true;
  allow write: if isAdmin();
}
```

---

## Validation Summary

| Scenario | Client | Server |
|---|---|---|
| No package selected | Block: package required | Return 422 if missing |
| Basic + no insurance doc | Block Step 3 advance | Return 422 `insurance_required` |
| Basic + rejected insurance | Show inline error | Return 422 `insurance_rejected` |
| Basic + pending/approved insurance | Allow | Allow |
| Standard / Premium | No insurance check | No insurance check |
| Invalid packageId | N/A | Return 422 `invalid_package` |

---

## Acceptance Criteria (DCR-046 through DCR-049)

### DCR-046 — Package selection + pricing
- [ ] Default selection is `standard` on wizard mount
- [ ] Selecting a tier immediately updates `protectionAmount` and `depositAmount` in BookingContext
- [ ] `protectionPricing` fetched from Firestore `protection_pricing/current` on wizard mount
- [ ] Prices shown in UI reflect Firestore values (not hardcoded)
- [ ] Step 4 Review shows protection tier name, daily fee, and total protection cost
- [ ] Step 4 Review shows adjusted deposit amount when premium is selected

### DCR-047 — Insurance requirement enforcement
- [ ] Selecting Basic makes insurance upload required in Step 3
- [ ] Cannot advance past Step 3 with Basic selected and no insurance uploaded
- [ ] If insurance already on file (non-rejected), Step 3 shows "Insurance on file ✓" for Basic
- [ ] Server-side: `POST /api/bookings/create` returns 422 if Basic + missing/rejected insurance doc
- [ ] Selecting Standard or Premium skips insurance requirement (optional upload only)

### DCR-048 — Stripe + booking integrity
- [ ] `protectionPackage` included in Stripe PI metadata
- [ ] `protectionAmount` included in Stripe PI metadata
- [ ] Stripe charge amount = `depositAmount` (already correct; deposit uses modified amount)
- [ ] `POST /api/bookings/create` validates `protectionPackage` is a valid tier
- [ ] `BookingPricing.protectionAmount` written to Firestore at booking creation
- [ ] `BookingPricing.depositAmount` reflects deposit modifier (50% for premium)

### DCR-049 — Admin + customer visibility
- [ ] Admin booking detail shows protection package name and daily fee
- [ ] Admin booking list shows protection package as a column or badge
- [ ] Customer portal booking card shows protection tier
- [ ] Customer portal booking detail shows full protection breakdown

---

## TypeScript Files to Create/Modify

| File | Action |
|---|---|
| `types/protection.ts` | Create — `ProtectionPackageId`, `ProtectionPackage`, `ProtectionPricing` |
| `types/booking.ts` | Modify — add `protectionPackage` to `Booking`; add `protectionAmount` to `BookingPricing` |
| `types/index.ts` | Modify — re-export from `protection.ts` |
| `lib/utils/pricing.ts` | Modify — update `computeBookingPricing` signature + logic |
| `lib/constants/protection.ts` | Create — static package definitions (name, description, depositModifier, etc.) |
| `components/providers/BookingProvider.tsx` | Modify — add `protectionPackage` state + `setProtectionPackage` action |
| `components/booking/steps/Step2Extras.tsx` | Modify — add protection package radio group at top; remove CDW toggle |
| `components/booking/steps/Step3Documents.tsx` | Modify — conditional insurance requirement based on package |
| `components/booking/steps/Step4Review.tsx` | Modify — add protection line item |
| `app/api/stripe/create-payment-intent/route.ts` | Modify — include `protectionPackage` + `protectionAmount` in metadata; use modified deposit |
| `app/api/bookings/create/route.ts` | Modify — validate package; enforce insurance rule; write `protectionPackage` + updated pricing |
