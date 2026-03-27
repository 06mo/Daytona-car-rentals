# DCR-050 — ABI Coverage Alignment & Policy Validation

**Owner:** Claude
**Status:** Complete
**Depends on:** DCR-045 (protection package definitions)

---

## Overview

This document defines how Daytona Car Rentals' ABI (fleet/operator insurance) policy aligns with the protection package tiers, specifies which coverage period applies at each stage of a rental, establishes what the system must validate at checkout to remain compliant, and documents the operational workflow for staff.

---

## Coverage Periods (Period Model)

Rental operators typically carry insurance that divides risk into distinct coverage periods based on vehicle status. Daytona Car Rentals operates under the following period model:

| Period | Vehicle Status | Primary Coverage |
|---|---|---|
| **Period N** (Not-rented) | Vehicle not on an active rental; in fleet inventory | ABI commercial fleet policy (operator is primary) |
| **Period R** (On-rental) | Vehicle on an active booking (`status: 'active'`) | Depends on renter's selected protection package (see below) |

> **Note:** Unlike Transportation Network Company (TNC) insurance periods, direct rental operators do not have a "waiting/available" period as a distinct coverage exposure. Period N covers all non-rental time.

---

## Period R — Coverage by Protection Package

When a vehicle is on an active rental, the coverage stack depends on the renter's chosen package:

### Basic (Renter's Own Coverage)

```
Primary:    Renter's personal auto policy (insurance card on file)
Secondary:  ABI fleet policy — contingent / excess only
            (kicks in only if renter's policy denies claim or limits are exceeded)

Operator liability exposure: LOW if renter has valid coverage
                             HIGH if renter's insurance lapses or is invalid
```

**Why basic requires insurance:** The ABI policy's contingent coverage is a backstop, not a primary layer. If the renter has no valid insurance, the operator's ABI policy may bear the full claim — at significantly higher cost and potential policy impact.

---

### Standard Protection

```
Primary:    ABI fleet policy — rental liability + CDW layer activated
            $500 deductible applied to renter for physical damage/theft
Secondary:  N/A (ABI covers above deductible)

Operator liability exposure: MODERATE (ABI absorbs claim above $500 deductible)
```

---

### Premium (Full Protection)

```
Primary:    ABI fleet policy — full rental protection layer activated
            $0 deductible — operator waives renter's exposure entirely
Secondary:  N/A

Operator liability exposure: FULL (ABI absorbs entire claim)
```

---

## Checkout Validation Requirements (ABI Compliance)

These rules must be enforced at checkout (server-side, `POST /api/bookings/create`) to maintain ABI policy compliance:

### Rule 1 — Basic package: insurance must be on file

```
IF protectionPackage === 'basic'
  THEN users/{userId}/documents/insurance_card must exist
  AND  document.status must be 'approved' OR 'pending'

  BLOCKED if: document missing, or status === 'rejected'
```

Rationale: ABI contingent coverage requires the renter to carry their own primary auto insurance. A booking confirmed without this violates the coverage structure.

---

### Rule 2 — Insurance card must not be rejected

```
IF protectionPackage === 'basic'
  AND document.status === 'rejected'
  THEN booking creation must fail with:
    { error: 'insurance_rejected', message: '...' }
```

An admin-rejected insurance card means the submitted document was invalid (expired, illegible, or not a valid policy). The renter must either re-upload a valid card or switch to Standard/Premium.

---

### Rule 3 — Protection package must be a valid tier

```
protectionPackage must be one of: 'basic' | 'standard' | 'premium'
If missing or invalid → return 422
```

This prevents legacy bookings or API tampering from creating bookings without a coverage decision.

---

### Rule 4 — Deposit amount must reflect the modifier

```
booking.pricing.depositAmount must equal:
  Math.round(vehicle.depositAmount × depositModifier)

  where depositModifier:
    basic, standard → 1.0
    premium         → 0.5
```

The server must recompute this and not trust the client's `depositAmount`.

---

## Admin Operational Workflow

### Before Vehicle Pickup

When a booking transitions to `confirmed` and admin is preparing for pickup:

| Package | Admin Action |
|---|---|
| Basic | Verify insurance card approval before releasing keys. If still `pending`, review and approve/reject before pickup day. **Do not release vehicle if insurance is pending and has not been reviewed.** |
| Standard | No insurance check required. Confirm CDW waiver is noted in rental agreement. |
| Premium | No insurance check required. Note zero-deductible on rental agreement. Confirm reduced deposit collected. |

---

### At Vehicle Pickup

The remaining balance collected at pickup must include the protection total if not already included in the online charge:

```
Remaining balance at pickup =
  totalAmount - depositAmount
  = (baseAmount + extrasAmount + protectionAmount) - depositAmount
```

The protection fee is part of the total and is collected at pickup as part of the remaining balance. It is **not** a separate Stripe charge — it flows into the offline balance collection.

---

### Incident / Claim Workflow

If a renter reports damage or theft during the rental:

**Basic:**
1. Contact renter for insurance details (already on file).
2. File claim against renter's personal policy.
3. ABI contingent coverage is the fallback — only invoke if renter's insurer denies.
4. Document everything in admin notes on the booking.

**Standard:**
1. ABI claim filed by operator.
2. Collect $500 deductible from renter (process via Stripe additional charge or collect in person).
3. Document deductible collection in booking.

**Premium:**
1. ABI claim filed by operator.
2. No deductible collected from renter.
3. Document incident in booking.

---

## System Validation at Booking Creation (Server-Side Checklist)

All of the following must be validated in `POST /api/bookings/create`:

```
1. ✓ protectionPackage is present and valid ('basic' | 'standard' | 'premium')
2. ✓ If basic:
       - insurance_card document exists for userId
       - document.status is 'approved' or 'pending'
3. ✓ pricing.protectionAmount === computed protection fee (server-side)
4. ✓ pricing.depositAmount === vehicle.depositAmount × depositModifier (server-side)
5. ✓ pricing.totalAmount === baseAmount + extrasAmount + protectionAmount (server-side)
```

None of these values are trusted from the client request body — they are always recomputed server-side from Firestore data.

---

## Firestore Booking Fields Written at Creation

```ts
{
  protectionPackage: 'standard',          // what was selected
  pricing: {
    dailyRate: 8500,
    totalDays: 5,
    baseAmount: 42500,
    extrasAmount: 1500,
    protectionAmount: 12500,              // $25/day × 5 days
    depositAmount: 20000,                 // vehicle.depositAmount × 1.0
    totalAmount: 56500,                   // base + extras + protection
  }
}
```

---

## Admin Dashboard — Protection Package Visibility

To support the operational workflow, protection package data must be visible in:

### Booking List View
- Show package badge: `Basic` (gray), `Standard` (blue), `Premium` (gold)

### Booking Detail View

```
Protection Package:   Standard Protection
                      CDW included · $500 deductible
                      $25.00/day × 5 days = $125.00

Insurance on File:    ✓ Approved  (required for Basic)
                        [View Document]

Remaining at Pickup:  $365.00
  (includes protection fee of $125.00 + base balance)
```

### Pre-Pickup Alert (admin queue)

When `status === 'confirmed'` AND `protectionPackage === 'basic'` AND `insuranceStatus === 'pending'`:

Show warning banner in admin booking detail:
> ⚠️ Insurance review required before pickup. This booking uses Basic protection — the renter's insurance card must be approved before the vehicle is released.

---

## Summary: Coverage Matrix

| Package | Insurance Required | CDW | Deductible | Deposit Modifier | ABI Role |
|---|---|---|---|---|---|
| Basic | Yes (renter's own) | No (renter's policy) | Renter's policy deductible | 1.0× | Contingent/excess only |
| Standard | No | Yes | $500 | 1.0× | Primary (above deductible) |
| Premium | No | Yes (full waiver) | $0 | 0.5× | Primary (full coverage) |

---

## Files Affected

No code changes are required for DCR-050 — this is a design and compliance document. The implementation of these rules is handled by DCR-046 through DCR-049 (Codex tasks).

However, when Codex implements DCR-047 and DCR-048, they must reference this document for:
- The correct validation rules (Section: Checkout Validation Requirements)
- The correct server-side field list (Section: Firestore Booking Fields Written at Creation)
- The admin UI requirements (Section: Admin Dashboard — Protection Package Visibility)
