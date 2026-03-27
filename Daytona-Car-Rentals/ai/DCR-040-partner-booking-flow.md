# DCR-040 — Partner Booking Flow

**Owner:** Claude
**Status:** Complete
**Blocks:** DCR-041

---

## Objective

Enable hotels, Airbnb hosts, concierge desks, and other local partners to send guests
to Daytona Car Rentals via a tracked referral link. Every booking originating from a
partner link is attributed to that partner so the admin can measure referral volume
and revenue. No partner self-service portal, no commission payout — attribution and
visibility only at this stage.

---

## Guiding Constraints

1. **Never block a booking.** If a referral code is missing, unknown, or for an inactive
   partner, the booking proceeds without attribution. Referral tracking is purely additive.
2. **Server validates codes.** The client passes the stored code at booking time; the
   server looks it up in Firestore. The client cannot self-assign a partner.
3. **Booking type changes are backward-compatible.** New fields on `Booking` and
   `CreateBookingInput` are optional — no existing code needs updating.
4. **No deep changes to the booking wizard.** The wizard already reads `start`, `end`,
   and `location` from URL params in Step 1. Referral capture is a separate thin
   component that runs outside the wizard.

---

## Firestore Collection: `partners`

```typescript
type PartnerStatus = "active" | "inactive";

type Partner = {
  id: string;
  name: string;           // "Hilton Daytona Beach", "Paradise Airbnb Concierge"
  code: string;           // URL-safe slug: "hilton-daytona", "paradise-airbnb"
  contactEmail: string;
  status: PartnerStatus;
  notes?: string;         // internal admin notes
  createdAt: Date;
  updatedAt: Date;
};
```

### Code format

Lowercase alphanumeric + hyphens, 3–40 characters. Examples: `"hilton-daytona"`,
`"ocean-walk-resort"`, `"plaza-hotel"`. Validated server-side with regex
`/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/` (minimum 3 chars, no leading/trailing hyphens).

### Firestore security rules

```
match /partners/{partnerId} {
  allow read: if isAdmin();
  allow write: if isAdmin();
}
```

No client reads. Partner data never leaves the server.

### Firestore index

Add to `firestore.indexes.json`:
```json
{ "collectionGroup": "bookings", "fields": [
  { "fieldPath": "referralCode", "order": "ASCENDING" },
  { "fieldPath": "createdAt", "order": "DESCENDING" }
]}
```

---

## Updated `Booking` and `CreateBookingInput` Types

Add two optional fields to both. All existing fields unchanged.

```typescript
// types/booking.ts — add to Booking and CreateBookingInput
referralCode?: string;   // the code that was in the URL when the session started
partnerId?: string;      // resolved from referralCode at booking creation time
```

`partnerId` is always set by the server when `referralCode` resolves to an active partner.
`referralCode` is always stored verbatim for auditing even if the partner is unknown.

---

## New Types File: `types/partner.ts`

```typescript
export type PartnerStatus = "active" | "inactive";

export type Partner = {
  id: string;
  name: string;
  code: string;
  contactEmail: string;
  status: PartnerStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type PartnerStats = {
  partner: Partner;
  totalBookings: number;
  last30DayBookings: number;
  totalRevenueCents: number;
};
```

Add to `types/index.ts` barrel: `export * from "./partner";`

---

## New Service: `lib/services/partnerService.ts`

`server-only`.

```typescript
export async function getPartnerByCode(code: string): Promise<Partner | null>
// Queries partners where code == code and status == "active".
// Returns null if not found or inactive.
// FirebaseConfigError → return null silently.

export async function listPartners(): Promise<Partner[]>
// Returns all partners ordered by name asc.
// FirebaseConfigError → return [].

export async function getPartnerStats(partner: Partner): Promise<PartnerStats>
// Queries bookings where referralCode == partner.code.
// Counts total and last-30-days bookings.
// Sums booking.pricing.totalAmount for all attributed bookings.
// FirebaseConfigError → returns zeroed stats (never throws).
```

All functions: `FirebaseConfigError` → silent fallback. Other errors → `console.error`
and return null/[]/zeroed stats. Never throw.

---

## Client-Side Referral Capture

### Component: `components/analytics/ReferralTracker.tsx`

`'use client'`

Runs alongside `AnalyticsTracker` in the root layout. Reads the `ref` URL param on
every route change and saves it to `sessionStorage` if present.

```typescript
// Mount in app/layout.tsx alongside AnalyticsTracker:
<ReferralTracker />
```

Behavior:
1. On mount and on `pathname` change, read `searchParams.get("ref")`
2. If present and non-empty, write `window.sessionStorage.setItem("referral_code", value)`
3. If the `ref` param is absent on a subsequent page, **do not clear** the stored value —
   it persists for the entire browser session
4. Return `null` — no DOM output
5. Additionally fire a `void fetch("/api/analytics/track", ...)` with `eventName: "referral_click"`,
   `path: currentPath`, `metadata: { referralCode: value }` — once per session per code
   (guard with a `useRef` to avoid firing on every route change when code hasn't changed)

`AnalyticsEventName` must be extended to include `"referral_click"`.

---

## Booking Creation Flow (Updated)

### How the referral code flows through the booking

```
1. Customer arrives at /fleet?ref=hilton-daytona
   → ReferralTracker saves "hilton-daytona" to sessionStorage

2. Customer browses, selects vehicle, enters booking wizard
   → No UI change in the wizard

3. Step 5 (Payment): POST /api/stripe/create-payment-intent
   → Client reads sessionStorage["referral_code"] (may be null)
   → Sends { ..., referralCode: "hilton-daytona" } in request body
   → Server stores in PI metadata for Stripe-level tracking

4. POST /api/bookings/create
   → Client sends { ..., referralCode: "hilton-daytona" } in request body
   → Server calls getPartnerByCode("hilton-daytona")
   → If active partner found: sets booking.partnerId = partner.id
   → booking.referralCode = "hilton-daytona" (always stored verbatim)
   → If unknown/inactive: booking.referralCode stored, partnerId omitted — booking proceeds normally
```

### `POST /api/stripe/create-payment-intent` (updated)

Add `referralCode?: string` to `CreatePaymentIntentRequest`. Pass it through to Stripe PI
metadata alongside existing `userId` and `vehicleId`:

```typescript
metadata: {
  userId: user.userId,
  vehicleId: body.vehicleId,
  ...(body.referralCode ? { referralCode: body.referralCode } : {}),
}
```

No validation needed here — just pass through for Stripe-level tracking.

### `POST /api/bookings/create` (updated)

Add `referralCode?: string` to `CreateBookingRequest`. After the booking creation call:

```typescript
let partnerId: string | undefined;

if (body.referralCode) {
  const partner = await getPartnerByCode(body.referralCode);
  if (partner) { partnerId = partner.id; }
}

const booking = await createBooking({
  ...existingFields,
  ...(body.referralCode ? { referralCode: body.referralCode } : {}),
  ...(partnerId ? { partnerId } : {}),
}, user.userId, user.role);
```

`getPartnerByCode` failure (any error) must not throw — it's wrapped in `partnerService`'s
own error handling. If it returns `null`, the booking proceeds without partner attribution.

### BookingWizard / Step5Payment (updated)

In `Step5Payment.tsx`, before calling `POST /api/stripe/create-payment-intent` and
`POST /api/bookings/create`, read the referral code from sessionStorage:

```typescript
const referralCode = window.sessionStorage.getItem("referral_code") ?? undefined;
```

Pass it in both request bodies. No UI change — the customer never sees referral tracking.

---

## Admin UI

### Booking detail page: partner attribution row

In `app/(admin)/admin/bookings/[bookingId]/page.tsx`, add a "Referral" row to the
Booking Details card when `booking.referralCode` is present:

```
Referral:   hilton-daytona  (Hilton Daytona Beach)
```

Resolve the partner name server-side: if `booking.partnerId` is set, fetch the partner
document. If only `referralCode` is set (unknown partner), show the raw code with
`(unrecognised)` label.

### New admin page: `/admin/partners`

Route: `app/(admin)/admin/partners/page.tsx`

RSC, protected by the existing admin layout auth guard.

```
Partners                                      [+ Add via Firestore]

┌─────────────────────┬──────────────────┬───────────┬────────────┬───────────────┐
│ Partner             │ Code             │ Status    │ Bookings   │ Revenue       │
├─────────────────────┼──────────────────┼───────────┼────────────┼───────────────┤
│ Hilton Daytona      │ hilton-daytona   │ Active    │ 14 (3 mo)  │ $8,240        │
│ Paradise Airbnb     │ paradise-airbnb  │ Active    │  6 (1 mo)  │ $3,100        │
│ Ocean Walk Resort   │ ocean-walk       │ Inactive  │  2 (—)     │ $1,050        │
└─────────────────────┴──────────────────┴───────────┴────────────┴───────────────┘
```

Data fetched with `Promise.all([listPartners(), ...partnerStatsPerPartner])`.
Revenue shown in formatted USD. Bookings column shows all-time count and last-30-days
count in parentheses if > 0.

No create/edit UI in this task. Partners are added directly in Firestore. A note
in the page header: "To add a partner, create a document in the `partners` collection
in Firestore."

### AdminSidebar

Add "Partners" nav item to `components/layout/AdminSidebar.tsx` below Verifications.

---

## Partner Deep-Link Format

A hotel can send guests to any of these URLs. The `ref` param is captured on arrival
and persists for the session regardless of which page the customer lands on.

```
# Fleet page (browse all vehicles)
https://daytonacarrentals.com/fleet?ref=hilton-daytona

# Specific vehicle (direct to booking flow)
https://daytonacarrentals.com/fleet/[vehicleId]?ref=hilton-daytona

# Pre-filled booking (dates + location from Step 1 URL param logic already in place)
https://daytonacarrentals.com/booking/[vehicleId]?ref=hilton-daytona&start=2026-06-01&end=2026-06-07&location=daytona-beach-airport
```

No additional URL handling needed — Step 1 already reads `start`, `end`, `location`
from search params. `ref` is handled entirely by `ReferralTracker`.

---

## Seed Data

Create `lib/data/partnersSeed.ts` with a few representative partners. Used only for
manual one-time Firestore seeding — not imported at runtime.

```typescript
export const partnersSeed: Omit<Partner, "id">[] = [
  { name: "Hilton Daytona Beach Resort", code: "hilton-daytona", contactEmail: "concierge@hiltondaytona.example.com", status: "active", createdAt, updatedAt },
  { name: "Ocean Walk Resort", code: "ocean-walk", contactEmail: "front-desk@oceanwalk.example.com", status: "active", createdAt, updatedAt },
  { name: "The Plaza Hotel", code: "plaza-hotel", contactEmail: "concierge@plazadaytona.example.com", status: "active", createdAt, updatedAt },
];
```

---

## Deliverables for DCR-041

- [ ] `types/partner.ts` — `Partner`, `PartnerStats`, `PartnerStatus`
- [ ] `types/index.ts` — barrel updated
- [ ] `types/booking.ts` — `referralCode?` and `partnerId?` added to `Booking` and `CreateBookingInput`
- [ ] `types/analytics.ts` — `"referral_click"` added to `AnalyticsEventName`
- [ ] `lib/services/partnerService.ts` — `getPartnerByCode`, `listPartners`, `getPartnerStats`
- [ ] `lib/data/partnersSeed.ts` — seed data
- [ ] `components/analytics/ReferralTracker.tsx` — sessionStorage capture + analytics fire
- [ ] `app/layout.tsx` — `<ReferralTracker />` mounted
- [ ] `components/booking/steps/Step5Payment.tsx` — `referralCode` read from sessionStorage and passed in both API calls
- [ ] `app/api/stripe/create-payment-intent/route.ts` — `referralCode` passed to PI metadata
- [ ] `app/api/bookings/create/route.ts` — `referralCode` validated, `partnerId` resolved and stored
- [ ] `app/(admin)/admin/partners/page.tsx` — partner list with stats
- [ ] `app/(admin)/admin/bookings/[bookingId]/page.tsx` — referral attribution row added
- [ ] `components/layout/AdminSidebar.tsx` — Partners nav item added
- [ ] `firestore.rules` — `partners` collection rule added
- [ ] `firestore.indexes.json` — `(referralCode, createdAt desc)` composite index added
- [ ] `npm run build` passes

---

## What is NOT in scope

- Partner self-service portal (login, link generator, stats dashboard)
- Commission calculation or payout
- Partner-specific discount codes (that's DCR-036)
- Link expiry or per-link attribution (one code per partner for now)
- Multi-touch attribution (first-touch via sessionStorage is sufficient)
