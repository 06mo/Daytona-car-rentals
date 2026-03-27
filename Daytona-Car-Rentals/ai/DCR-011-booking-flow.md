# DCR-011 — Booking Flow Spec (Multi-Step)

**Owner:** Claude
**Status:** Complete
**Depends on:** DCR-003, DCR-014

---

## Route

```
/booking/[vehicleId]           ← multi-step wizard
/booking/confirmation/[bookingId]  ← success page
```

---

## Architecture

`BookingWizard` is the top-level `'use client'` component that owns all step state. It is rendered inside a thin RSC page that passes the vehicle (fetched server-side) as a prop.

```
app/(customer)/booking/[vehicleId]/page.tsx   (RSC — auth-guarded)
  └─ fetches vehicle from Firestore
  └─ renders <BookingWizard vehicle={vehicle} />
        └─ <BookingProvider>         ← context for form state
              └─ <StepIndicator />
              └─ {currentStep === 1 && <Step1Dates />}
              └─ {currentStep === 2 && <Step2Extras />}
              └─ {currentStep === 3 && <Step3Documents />}
              └─ {currentStep === 4 && <Step4Review />}
              └─ {currentStep === 5 && <Step5Payment />}
```

---

## BookingContext

**File:** `components/providers/BookingProvider.tsx`

```ts
interface BookingState {
  vehicleId: string
  startDate: string           // ISO
  endDate: string             // ISO
  totalDays: number
  pickupLocation: string
  returnLocation: string

  extras: {
    additionalDriver: boolean
    gps: boolean
    childSeat: boolean
    cdw: boolean
  }

  pricing: {
    dailyRate: number         // cents — from vehicle (server-trusted)
    baseAmount: number
    extrasAmount: number
    depositAmount: number
    totalAmount: number
  }

  documents: {
    licenseUploaded: boolean
    licenseVerified: boolean
    insuranceUploaded: boolean
    insuranceVerified: boolean
  }

  step: number                // 1–5
}

interface BookingContextValue {
  state: BookingState
  setStep: (n: number) => void
  updateDates: (start: string, end: string) => void
  updateLocation: (pickup: string, returnLoc: string) => void
  toggleExtra: (key: keyof BookingState['extras']) => void
  setDocumentStatus: (type: 'license' | 'insurance', uploaded: boolean) => void
}
```

Pricing is **always recalculated from vehicle.dailyRate** (trusted from server prop), never from user input.

Extras pricing is fetched once from Firestore `extras_pricing/current` on wizard mount.

---

## Step Indicator

**File:** `components/booking/BookingWizard.tsx` (inline)

```
① Dates  ─  ② Extras  ─  ③ Documents  ─  ④ Review  ─  ⑤ Payment
```

- Completed steps: filled brand circle + checkmark
- Current step: filled brand circle + number
- Future steps: neutral circle + number
- Clicking a completed step navigates back to it
- Clicking a future step is disabled

---

## Step 1 — Dates & Location

**File:** `components/booking/steps/Step1Dates.tsx`

**Fields:**
- Pick-up Date (`<input type="date">` — min: today)
- Return Date (`<input type="date">` — min: startDate + 1)
- Pick-up Location (`<Select>` — static Daytona location list)
- Return Location (same select — defaults to same as pickup; can differ)

**Pre-fill:** Read `start`, `end`, `location` from URL search params on mount.

**Validation (Zod):**
```ts
const Step1Schema = z.object({
  startDate: z.string().min(1, 'Pick-up date required'),
  endDate: z.string().min(1, 'Return date required'),
  pickupLocation: z.string().min(1, 'Location required'),
  returnLocation: z.string().min(1, 'Return location required'),
}).refine(d => d.endDate > d.startDate, {
  message: 'Return date must be after pick-up date',
  path: ['endDate'],
})
```

**Availability check:** On "Continue", call `/api/vehicles/availability?vehicleId=X&start=Y&end=Z`. If vehicle is booked for those dates, show inline error — do not advance.

**On valid:** Update BookingContext dates + location, advance to step 2.

---

## Step 2 — Extras

**File:** `components/booking/steps/Step2Extras.tsx`

Display add-ons as toggle cards, each showing name + description + price per day.

```
┌──────────────────────────────────────────────┐
│  ○  Additional Driver            +$15/day    │
│     Add a second authorised driver           │
├──────────────────────────────────────────────┤
│  ●  GPS Navigation               +$10/day    │  ← selected
│     In-car GPS unit              +$X total   │
├──────────────────────────────────────────────┤
│  ○  Child Seat                   +$8/day     │
│     Suitable for ages 1–12                   │
├──────────────────────────────────────────────┤
│  ○  Collision Damage Waiver      +$25/day    │
│     Reduce excess to $0                      │
└──────────────────────────────────────────────┘
```

- Prices from Firestore `extras_pricing/current` (fetched on wizard mount)
- Selecting an extra immediately updates `pricing.extrasAmount` in context
- `<PriceSummary />` shown at bottom of step with running total
- No validation required — all extras are optional

---

## Step 3 — Documents

**File:** `components/booking/steps/Step3Documents.tsx`

### Skip logic

```ts
if (user.verificationStatus === 'verified') {
  // Show green "Documents verified ✓" banner
  // Auto-advance to step 4 after 1s OR show "Continue" button immediately
}
```

### Upload UI (if not verified)

Two upload zones side by side (desktop) / stacked (mobile):

```
┌─────────────────────────┐  ┌─────────────────────────┐
│  Driver's License       │  │  Insurance Card         │
│                         │  │                         │
│  [↑ Upload]             │  │  [↑ Upload]             │
│  JPG, PNG, PDF · 10MB   │  │  JPG, PNG, PDF · 10MB   │
│                         │  │                         │
│  [preview after upload] │  │  [preview after upload] │
└─────────────────────────┘  └─────────────────────────┘

Both documents required to continue.
Under review — we'll verify before your trip.
```

### `DocumentUpload` component (used here)

**File:** `components/documents/DocumentUpload.tsx`

```ts
interface DocumentUploadProps {
  type: 'drivers_license' | 'insurance_card'
  userId: string
  onUploadComplete: (ref: string) => void
}
```

**Behavior:**
1. File selected (drag-drop or click) → validate MIME + size client-side
2. Reject with message if invalid: "File must be JPG, PNG, or PDF under 10MB"
3. Upload to Firebase Storage: `users/{userId}/documents/{type}/{filename}`
4. Show progress bar during upload (`uploadBytesResumable`)
5. On complete → write to Firestore `users/{userId}/documents/{type}`:
   ```ts
   { type, storageRef, fileName, fileSize, mimeType, status: 'pending', uploadedAt }
   ```
6. Show thumbnail (image) or filename + size (PDF)
7. Update `BookingContext.documents` — mark uploaded

**Validation (client):**
- Accepted MIME types: `image/jpeg`, `image/png`, `application/pdf`
- Max size: 10MB (10 × 1024 × 1024 bytes)

**Step advance condition:** Both `licenseUploaded` and `insuranceUploaded` are true in context (or `verificationStatus === 'verified'`).

---

## Step 4 — Review

**File:** `components/booking/steps/Step4Review.tsx`

Full order summary before payment. Read-only — edit links go back to relevant step.

```
Vehicle:      2023 Toyota Camry
Dates:        Apr 1 – Apr 6, 2026  (5 days)    [Edit ↗ step 1]
Location:     Daytona Beach Airport
Return:       Daytona Beach Airport

Extras:
  GPS Navigation                    $50.00
  Collision Damage Waiver          $125.00

Subtotal:                           $425.00
Extras:                             $175.00
────────────────────────────────────────────
Total:                              $600.00
Deposit (charged now):              $200.00
Remaining balance (at pickup):      $400.00

Documents:   ✓ Driver's License · ✓ Insurance Card

☐  I agree to the Rental Terms & Conditions

[← Back]                    [Proceed to Payment →]
```

**Validation:**
- Terms checkbox must be checked before advancing
- If terms unchecked: show error `"Please accept the terms to continue"`

**Pricing display:** All values from `BookingContext.pricing` (cents ÷ 100, formatted as USD).

---

## Step 5 — Payment

**File:** `components/booking/steps/Step5Payment.tsx`

### Mount sequence

```
1. Component mounts
2. POST /api/stripe/create-payment-intent
   { vehicleId, startDate, endDate, extras, userId }
3. Receive { clientSecret, paymentIntentId }
4. Render Stripe Elements with clientSecret
5. Customer enters card details
6. stripe.confirmCardPayment(clientSecret)
7. On success: POST /api/bookings/create { paymentIntentId, bookingData }
8. Receive { bookingId }
9. router.push('/booking/confirmation/[bookingId]')
```

**While loading PaymentIntent:** Show `<Spinner />` + "Preparing secure checkout..."

**On payment failure:** Show `<Toast variant="error">` with Stripe error message. Allow retry without leaving step.

**Stripe Elements appearance:**
```ts
const appearance = {
  theme: 'stripe',
  variables: {
    colorPrimary: '#f97316',   // brand-500
    borderRadius: '8px',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
}
```

**Security note for Codex:** The `amount` in the PaymentIntent is computed **server-side** in `/api/stripe/create-payment-intent` from Firestore data — never trust the client's `totalAmount`.

---

## Confirmation Page

**Route:** `/booking/confirmation/[bookingId]`

```
✓ Booking Confirmed!
Booking #DCR-XXXXXX

Your booking is confirmed. We'll review your documents
and send a confirmation email before your trip.

Vehicle:    2023 Toyota Camry
Dates:      Apr 1 – Apr 6, 2026
Total Paid: $600.00

[View My Bookings]   [Back to Home]
```

- Fetches booking from Firestore by ID (RSC)
- If booking not found or userId doesn't match: `notFound()`

---

## Validation Summary per Step

| Step | Required fields | Blocking checks |
|---|---|---|
| 1 | startDate, endDate, pickupLocation, returnLocation | endDate > startDate; vehicle available for range |
| 2 | None | None (all optional) |
| 3 | Both documents uploaded OR already verified | Cannot advance without both uploaded |
| 4 | Terms checkbox | Must be checked |
| 5 | Stripe card fields | Stripe handles; PaymentIntent must exist |

---

## Acceptance Criteria (Codex DCR-012, DCR-013)

- [ ] Step indicator shows correct state (complete/current/future)
- [ ] Clicking completed step navigates back correctly
- [ ] BookingContext state survives clicking Back (no data loss)
- [ ] Step 1: availability API called on Continue; error shown if unavailable
- [ ] Step 2: extras total updates immediately on toggle
- [ ] Step 3: skip shown if `verificationStatus === 'verified'`
- [ ] Step 3: both documents must be uploaded to advance
- [ ] Step 3: upload progress bar visible during Firebase Storage upload
- [ ] Step 3: re-upload replaces existing file at same Storage path
- [ ] Step 4: all pricing values match BookingContext (no independent recalculation)
- [ ] Step 4: "Edit" links return to correct step with state preserved
- [ ] Step 5: PaymentIntent created before Stripe Elements rendered
- [ ] Step 5: payment failure shows toast, does not navigate away
- [ ] Step 5: on success, booking written to Firestore then redirect to confirmation
- [ ] Confirmation page shows correct booking data
