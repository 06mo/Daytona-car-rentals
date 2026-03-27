# DCR-054 — Admin Booking Adjustments & Post-Booking Charges

**Owner:** Claude
**Status:** Complete
**Blocks:** DCR-055

---

## Overview

After a booking is confirmed or active, admin may need to modify it: extend the trip, add charges (damage fees, cleaning, extra mileage), apply credits or corrections, or update the remaining balance. These adjustments are tracked individually, linked to the booking, and may trigger an additional Stripe payment request to the customer.

---

## Adjustment Model

Each adjustment is an immutable record in a sub-collection. Adjustments are append-only — never edited or deleted. The booking's `totalAmount` and balance due are derived by summing the original pricing plus all applied adjustments.

```ts
// types/adjustment.ts

export type AdjustmentType =
  | 'extension'        // trip end date extended
  | 'fee'              // additional charge (damage, cleaning, mileage, etc.)
  | 'credit'           // reduction in amount owed (goodwill, dispute resolution)
  | 'correction'       // admin pricing correction (fix a data entry error)

export type AdjustmentStatus =
  | 'pending'          // created, awaiting payment (for fee type)
  | 'paid'             // payment confirmed via Stripe
  | 'waived'           // admin waived without charging
  | 'applied'          // no payment needed (credit or correction)

export interface BookingAdjustment {
  id: string
  bookingId: string
  type: AdjustmentType

  amountCents: number              // positive = charge, negative = credit
                                   // always positive for 'fee'; always negative for 'credit'
                                   // may be either for 'correction' or 'extension'

  reason: string                   // required; admin-visible and audit-logged
  customerVisibleNote?: string     // optional; shown to customer in portal and email

  status: AdjustmentStatus

  // For 'extension' type only:
  extensionDetails?: {
    originalEndDate: Date
    newEndDate: Date
    additionalDays: number
    dailyRate: number              // cents — rate applied to extension days
  }

  // Payment request (for fee type, when not waived)
  stripePaymentIntentId?: string   // populated when payment is requested
  stripePaymentLinkUrl?: string    // short-lived Stripe Payment Link for customer

  createdBy: string                // admin userId
  createdAt: Date
  updatedAt: Date
  paidAt?: Date
  waivedAt?: Date
  waivedBy?: string               // admin userId
}
```

**Firestore path:** `bookings/{bookingId}/adjustments/{adjustmentId}`

---

## Adjustment Types Explained

### Extension

The customer keeps the vehicle longer than the original end date.

- Updates `booking.endDate` and `booking.totalDays` on the booking document
- `amountCents` = additionalDays × vehicle.dailyRate (including dynamic pricing rules if active)
- Requires collecting the additional amount from the customer (Stripe Payment Link or in-person)
- Booking status must be `confirmed` or `active` to allow extension

### Fee

A charge added after the rental period — damage, cleaning, excessive mileage, tolls, etc.

- Does NOT modify booking dates or `totalAmount` on the core booking
- `amountCents` is always positive
- Admin creates fee → system optionally generates a Stripe Payment Request → customer pays or admin waives
- Booking status must be `active` or `completed`

### Credit

A reduction of amount owed, applied as goodwill or dispute resolution.

- `amountCents` is always negative (stored as negative integer, e.g. -2000 = -$20.00)
- `status` = `'applied'` immediately — no Stripe action needed
- Can be applied at any post-confirmation status

### Correction

Fix an error in the original booking pricing.

- `amountCents` may be positive (additional charge) or negative (refund owed)
- Positive corrections require a payment request
- Negative corrections require a Stripe refund (issued via existing `refundPaymentIntent`)
- Booking status should be `pending_verification`, `confirmed`, or `active`

---

## Balance Calculation

The customer's remaining balance due at pickup and beyond is:

```
remainingBalance =
  booking.pricing.totalAmount
  - booking.pricing.depositAmount                  // already collected
  + sum(adjustments where amountCents > 0 and status in ['pending', 'applied', 'paid'])
  - sum(adjustments where amountCents < 0 and status in ['applied', 'paid'])
```

This is computed on-demand from the adjustments sub-collection, never stored as a derived field (avoids stale state).

---

## API Routes

### `POST /api/admin/bookings/[bookingId]/adjustments`

Create an adjustment.

**Auth:** Admin only.

**Request body:**
```ts
{
  type: AdjustmentType
  amountCents: number
  reason: string
  customerVisibleNote?: string

  // Extension only:
  newEndDate?: string   // ISO date — required if type === 'extension'

  // Trigger payment request immediately?
  requestPaymentNow?: boolean   // default false for fee/extension; N/A for credit/correction
}
```

**Server logic:**
```
1. Validate admin role
2. Fetch booking — verify correct status for adjustment type (see above)
3. Validate amountCents:
     fee: must be > 0
     credit: must be < 0
     correction/extension: non-zero
4. If type === 'extension':
     a. Validate newEndDate > booking.endDate
     b. Compute additionalDays and amountCents from vehicle dailyRate
        (ignore client amountCents — server-computed)
     c. Update booking.endDate, booking.totalDays, booking.totalAmount
5. Create adjustment document:
     id = auto-generated
     status = 'applied' (credit/correction with no payment)
             = 'pending' (fee/extension with payment needed)
6. If requestPaymentNow && status === 'pending':
     a. Create Stripe PaymentLink for amountCents
     b. Store stripePaymentLinkUrl on adjustment
     c. Send email to customer with payment link (notifyAdjustmentPaymentRequired)
7. Log audit event: 'booking_adjustment_created'
8. Return { adjustment }
```

---

### `POST /api/admin/bookings/[bookingId]/adjustments/[adjustmentId]/waive`

Waive a pending adjustment (mark as waived without charging).

**Auth:** Admin only.

**Logic:** Update adjustment `status = 'waived'`, record `waivedAt`, `waivedBy`. Log audit event.

---

### `POST /api/admin/bookings/[bookingId]/adjustments/[adjustmentId]/request-payment`

Generate/regenerate a Stripe Payment Link for an existing pending adjustment.

**Auth:** Admin only.

**Logic:**
```
1. Fetch adjustment — verify status === 'pending'
2. stripe.paymentLinks.create({
     line_items: [{ price_data: { currency: 'usd', unit_amount: adjustment.amountCents, product_data: { name: reason } }, quantity: 1 }],
     metadata: { bookingId, adjustmentId, userId: booking.userId },
   })
3. Update adjustment.stripePaymentLinkUrl
4. Send email to customer
5. Return { paymentLinkUrl }
```

---

### `POST /api/stripe/webhook` — handle adjustment payment completion

New webhook event: `payment_link.completed` (or `checkout.session.completed` if using Checkout Sessions instead of Payment Links).

```
on checkout.session.completed:
  if metadata.adjustmentId:
    update adjustment.status = 'paid', adjustment.paidAt = now
    update adjustment.stripePaymentIntentId = session.payment_intent
    log audit event: 'adjustment_payment_received'
```

---

### `GET /api/admin/bookings/[bookingId]/adjustments`

List all adjustments for admin view.

**Auth:** Admin only.

---

### `GET /api/bookings/[bookingId]/adjustments`

List customer-visible adjustments (those with `customerVisibleNote` set, or status = 'pending'/'paid').

**Auth:** Customer — ownership check.

---

## Admin UI

### Booking Detail — Adjustments Section

```
┌─────────────────────────────────────────────────────┐
│  Adjustments                              [+ Add]   │
│                                                     │
│  No adjustments on this booking.                    │
└─────────────────────────────────────────────────────┘
```

With items:
```
┌─────────────────────────────────────────────────────┐
│  Adjustments                              [+ Add]   │
│                                                     │
│  Damage fee            +$150.00   Pending   [Waive] │
│  "Bumper scuff noted at dropoff"            [Send ↗] │
│                                                     │
│  Extension (2 days)    +$170.00   Paid              │
│  "Customer extended via phone"                      │
└─────────────────────────────────────────────────────┘
│  Original total:       $600.00                      │
│  Adjustments:          +$150.00 (pending)           │
│  Balance at pickup:    $450.00                      │
│  (excl. pending adj.)                               │
└─────────────────────────────────────────────────────┘
```

### Add Adjustment Modal

Admin-facing modal fields:
- Type: dropdown (extension, fee, credit, correction)
- Reason: text input (required, internal)
- Customer note: text input (optional, shown to customer)
- Amount: number input in dollars (server converts to cents; for extension, server computes)
- New end date: date picker (extension only)
- Request payment now: checkbox (fee/extension)

---

## Customer Portal Display

In `(customer)/dashboard/bookings/[bookingId]/page.tsx`, add an Adjustments section that shows:
- Pending adjustments with "Payment Required" label and a link to the Stripe Payment Link
- Paid adjustments with paid amount
- Credits applied

Only show adjustments where `customerVisibleNote` is set or `status === 'pending'` (customer must be aware of pending payments).

---

## Email Notifications

Add new notification:

**`notifyAdjustmentPaymentRequired(booking, adjustment)`**
```
Subject: Payment required for your rental — Booking #DCR-XXXXXX
Body:
  An additional charge has been added to your rental:
  [reason / customerVisibleNote]
  Amount: $X.XX
  [Pay Now →] (Stripe Payment Link)

  This link expires in 72 hours.
```

---

## Firestore Security Rules

```firestore
match /bookings/{bookingId}/adjustments/{adjustmentId} {
  allow read: if isAdmin()
    || (isSignedIn()
        && get(/databases/$(database)/documents/bookings/$(bookingId)).data.userId == request.auth.uid
        && resource.data.customerVisibleNote != null);
  allow write: if isAdmin();
}
```

---

## Firestore Indexes

```json
{
  "collectionGroup": "adjustments",
  "fields": [
    { "fieldPath": "bookingId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "adjustments",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

---

## Audit Events

| Event | When |
|---|---|
| `booking_adjustment_created` | Any adjustment created |
| `booking_adjustment_waived` | Fee waived by admin |
| `adjustment_payment_requested` | Payment link sent to customer |
| `adjustment_payment_received` | Stripe payment confirmed |
| `booking_extended` | Extension adjustment applied |

---

## Acceptance Criteria (DCR-055)

- [ ] `POST /api/admin/bookings/[bookingId]/adjustments` creates adjustment with correct status
- [ ] Extension type updates `booking.endDate` and `booking.totalDays` atomically
- [ ] Extension `amountCents` computed server-side from vehicle dailyRate (not trusted from client)
- [ ] Fee `amountCents` must be > 0; credit must be < 0 — server validates
- [ ] `requestPaymentNow = true` creates Stripe Payment Link and stores URL on adjustment
- [ ] `requestPaymentNow = true` triggers `notifyAdjustmentPaymentRequired` email
- [ ] `/waive` endpoint transitions `pending → waived`, logs audit event
- [ ] Webhook `checkout.session.completed` with `adjustmentId` metadata marks adjustment `paid`
- [ ] Admin booking detail shows adjustments list with amount, status, action buttons
- [ ] Admin "+Add" button opens modal with all required fields; extension shows date picker
- [ ] Customer portal shows pending adjustments with payment link and applied adjustments
- [ ] Remaining balance calculation visible in admin booking detail

---

## TypeScript Files to Create/Modify

| File | Action |
|---|---|
| `types/adjustment.ts` | Create — `BookingAdjustment`, `AdjustmentType`, `AdjustmentStatus` |
| `types/index.ts` | Modify — re-export from `adjustment.ts` |
| `lib/services/adjustmentService.ts` | Create — `createAdjustment`, `waiveAdjustment`, `getAdjustments`, `computeRemainingBalance` |
| `lib/services/notificationService.tsx` | Modify — add `notifyAdjustmentPaymentRequired` |
| `app/api/admin/bookings/[bookingId]/adjustments/route.ts` | Create — POST + GET handlers |
| `app/api/admin/bookings/[bookingId]/adjustments/[adjustmentId]/waive/route.ts` | Create |
| `app/api/admin/bookings/[bookingId]/adjustments/[adjustmentId]/request-payment/route.ts` | Create |
| `app/api/bookings/[bookingId]/adjustments/route.ts` | Create — customer GET |
| `app/api/stripe/webhook/route.ts` | Modify — handle `checkout.session.completed` for adjustments |
| `app/(admin)/admin/bookings/[bookingId]/page.tsx` | Modify — add Adjustments section |
| `app/(customer)/dashboard/bookings/[bookingId]/page.tsx` | Modify — add customer adjustments view |
| `components/admin/AdjustmentPanel.tsx` | Create |
| `components/admin/AddAdjustmentModal.tsx` | Create |
| `firestore.rules` | Modify — add adjustments sub-collection rule |
| `firestore.indexes.json` | Modify — add adjustments indexes |
