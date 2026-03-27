# DCR-016 — Payment Flow Spec

**Owner:** Claude
**Status:** Complete
**Depends on:** DCR-001, DCR-014

---

## Payment Model

Daytona Car Rentals uses a **deposit-first model**:

| Charge | When | Amount |
|---|---|---|
| Deposit | At booking (online) | Fixed per vehicle (`vehicle.depositAmount`) |
| Remaining balance | At vehicle pickup (in person) | `totalAmount - depositAmount` |

The deposit is the only Stripe charge in the online flow. The balance is collected offline.

> **Rationale:** Simplifies online flow, reduces abandoned bookings, and matches standard rental industry practice.

---

## Flow Overview

```
Browser → POST /api/stripe/create-payment-intent
            └─ verify vehicle + dates server-side
            └─ compute amount from Firestore (never from client)
            └─ create Stripe Customer if first booking
            └─ return { clientSecret, paymentIntentId }

Browser → Stripe Elements → stripe.confirmCardPayment(clientSecret)

Browser → POST /api/bookings/create
            └─ verify PaymentIntent status via Stripe API (server-side)
            └─ write booking to Firestore (status: pending_verification)
            └─ return { bookingId }

Stripe → POST /api/stripe/webhook
            └─ payment_intent.succeeded → set paymentStatus: 'paid'
            └─ payment_intent.payment_failed → set status: 'payment_failed'
            └─ charge.refunded → set paymentStatus: 'refunded'
```

---

## API Routes

### `POST /api/stripe/create-payment-intent`

**File:** `app/api/stripe/create-payment-intent/route.ts`

**Auth:** Requires valid Firebase ID token (`withAuth` middleware).

**Request body:**
```ts
{
  vehicleId: string
  startDate: string         // ISO
  endDate: string           // ISO
  extras: {
    additionalDriver: boolean
    gps: boolean
    childSeat: boolean
    cdw: boolean
  }
}
```

**Server logic:**
```
1. Verify Firebase ID token → get userId
2. Fetch vehicle from Firestore → validate exists + available
3. Fetch extras_pricing/current from Firestore
4. Compute amount:
     totalDays = differenceInCalendarDays(endDate, startDate)
     baseAmount = vehicle.dailyRate * totalDays
     extrasAmount = sum of selected extras × totalDays
     chargeAmount = vehicle.depositAmount   ← only the deposit is charged online
5. Re-check availability (no double-booking)
6. Get or create Stripe Customer for this userId
     → store stripeCustomerId on users/{userId} if new
7. stripe.paymentIntents.create({
     amount: chargeAmount,           // cents
     currency: 'usd',
     customer: stripeCustomerId,
     metadata: {
       vehicleId, userId, startDate, endDate,
       totalAmount: String(baseAmount + extrasAmount),
       depositAmount: String(vehicle.depositAmount),
     },
     description: `Deposit – ${vehicle.year} ${vehicle.make} ${vehicle.model}`,
   })
8. Return { clientSecret, paymentIntentId }
```

**Error responses:**
- `401` — not authenticated
- `404` — vehicle not found
- `409` — vehicle not available for those dates
- `500` — Stripe error (log internally, return generic message)

---

### `POST /api/bookings/create`

**File:** `app/api/bookings/create/route.ts`

**Auth:** Requires valid Firebase ID token.

**Request body:**
```ts
{
  paymentIntentId: string
  vehicleId: string
  startDate: string
  endDate: string
  pickupLocation: string
  returnLocation: string
  extras: BookingExtras
}
```

**Server logic:**
```
1. Verify Firebase ID token → userId
2. Retrieve PaymentIntent from Stripe API (server-side)
3. Verify PI.status === 'succeeded' OR 'requires_capture'
4. Verify PI.metadata.userId === userId (prevent spoofing)
5. Verify PI.metadata.vehicleId matches request vehicleId
6. Run Firestore transaction:
     a. Re-check availability for date range
     b. Write bookings/{newId} with status: 'pending_verification', paymentStatus: 'pending'
        (webhook will set paymentStatus: 'paid' async)
7. Return { bookingId }
```

**Why write booking before webhook?** The browser confirms payment first. We write the booking immediately so the user sees the confirmation page. The webhook then upgrades `paymentStatus` to `'paid'` async. If the booking write fails after payment, admin can reconcile via Stripe dashboard.

---

### `POST /api/stripe/webhook`

**File:** `app/api/stripe/webhook/route.ts`

**CRITICAL:** This route must:
1. Read raw body as `Buffer` (Next.js must NOT parse JSON before signature check)
2. Verify signature: `stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)`
3. Be idempotent — events may be replayed

```ts
// Next.js config required to disable body parsing for this route:
export const config = { api: { bodyParser: false } }
```

**Handled events:**

| Event | Action |
|---|---|
| `payment_intent.succeeded` | Update booking `paymentStatus = 'paid'` via PI metadata.bookingId (or query by stripePaymentIntentId) |
| `payment_intent.payment_failed` | Update booking `status = 'payment_failed'`, `paymentStatus = 'failed'` |
| `charge.refunded` | Update booking `paymentStatus = 'refunded'` or `'partially_refunded'` |

**Finding the booking by PI ID:**
```ts
const bookings = await db.collection('bookings')
  .where('stripePaymentIntentId', '==', paymentIntentId)
  .limit(1)
  .get()
```

---

### `POST /api/bookings/[bookingId]/cancel`

**File:** `app/api/bookings/[bookingId]/cancel/route.ts`

**Auth:** Customer (own booking) or admin.

**Logic:**
```
1. Fetch booking — verify ownership
2. Check status allows cancellation:
     allowed: 'pending_verification', 'confirmed'
     not allowed: 'active', 'completed', 'cancelled'
3. If paymentStatus === 'paid':
     stripe.refunds.create({ payment_intent: booking.stripePaymentIntentId })
4. Update booking:
     status: 'cancelled'
     paymentStatus: 'refunded' (or keep 'paid' until webhook confirms)
     cancelledAt, cancelledBy, cancellationReason
```

---

## Stripe Customer Management

- One Stripe Customer per Firebase user (`stripeCustomerId` stored on `users/{userId}`)
- Created lazily on first PaymentIntent
- Allows future: saved payment methods, invoice history, Stripe Customer Portal

```ts
// lib/stripe/server.ts
export async function getOrCreateStripeCustomer(userId: string, email: string): Promise<string> {
  const userDoc = await db.collection('users').doc(userId).get()
  const user = userDoc.data() as User

  if (user.stripeCustomerId) return user.stripeCustomerId

  const customer = await stripe.customers.create({ email, metadata: { firebaseUserId: userId } })
  await db.collection('users').doc(userId).update({ stripeCustomerId: customer.id })
  return customer.id
}
```

---

## Amount Calculation (Server-Side Reference)

```ts
// lib/utils/pricing.ts
export function computeBookingPricing(
  vehicle: Vehicle,
  extrasPricing: ExtrasPricing,
  extras: BookingExtras,
  startDate: string,
  endDate: string,
): BookingPricing {
  const totalDays = differenceInCalendarDays(parseISO(endDate), parseISO(startDate))
  const baseAmount = vehicle.dailyRate * totalDays

  const extrasAmount =
    (extras.additionalDriver ? extrasPricing.additionalDriver * totalDays : 0) +
    (extras.gps             ? extrasPricing.gps * totalDays : 0) +
    (extras.childSeat       ? extrasPricing.childSeat * totalDays : 0) +
    (extras.cdw             ? extrasPricing.cdw * totalDays : 0)

  return {
    dailyRate: vehicle.dailyRate,
    totalDays,
    baseAmount,
    extrasAmount,
    depositAmount: vehicle.depositAmount,
    totalAmount: baseAmount + extrasAmount,
  }
}
```

This function is called in both the API route (server — authoritative) and client-side (display-only preview).

---

## Security Checklist

- [ ] Amount always computed server-side from Firestore data
- [ ] PaymentIntent verified server-side before booking write
- [ ] `metadata.userId` cross-checked before booking write
- [ ] Webhook signature verified before processing any event
- [ ] Stripe secret key never referenced in any `'use client'` file
- [ ] `STRIPE_SECRET_KEY` only imported in `lib/stripe/server.ts`
- [ ] Raw body parsing preserved for webhook route

---

## Acceptance Criteria (Codex DCR-017)

- [ ] `create-payment-intent` rejects unauthenticated requests with 401
- [ ] Amount in PaymentIntent = `vehicle.depositAmount` from Firestore (not client body)
- [ ] Stripe Customer created on first booking; reused on subsequent
- [ ] `bookings/create` verifies PaymentIntent status is `succeeded` before writing
- [ ] Webhook verifies `stripe-signature` header; returns 400 on invalid
- [ ] Webhook handler is idempotent (re-processing same event = no duplicate writes)
- [ ] Cancel endpoint issues Stripe refund before updating Firestore status
- [ ] `STRIPE_SECRET_KEY` not present in any client bundle (verify with `next build` output)
