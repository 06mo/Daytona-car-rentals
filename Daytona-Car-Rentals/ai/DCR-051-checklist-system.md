# DCR-051 — Pickup & Dropoff Checklist System

**Owner:** Claude
**Status:** Complete
**Blocks:** DCR-052, DCR-053

---

## Overview

The checklist system captures the vehicle's condition and key details at the moment of handoff (pickup) and return (dropoff). Each checklist is completed by staff, acknowledged by the customer, and persists alongside the booking for dispute resolution and ABI claims.

A checklist is required to transition a booking into or out of the `active` state:
- `confirmed → active` requires a completed pickup checklist
- `active → completed` requires a completed dropoff checklist

---

## Checklist Types

| Type | Triggered by | Transition |
|---|---|---|
| `pickup` | Vehicle handed to renter | `confirmed → active` |
| `dropoff` | Vehicle returned by renter | `active → completed` |

---

## Firestore: `bookings/{bookingId}/checklists/{type}`

Use a sub-collection to keep the booking document lean. `type` is always `'pickup'` or `'dropoff'`.

```ts
// types/checklist.ts

export type ChecklistType = 'pickup' | 'dropoff'
export type FuelLevel = 'empty' | 'quarter' | 'half' | 'three_quarter' | 'full'
export type ChecklistStatus = 'draft' | 'submitted'

export interface VehicleChecklist {
  id: string                        // = type ('pickup' | 'dropoff')
  bookingId: string
  vehicleId: string
  type: ChecklistType

  fuelLevel: FuelLevel
  odometerMiles: number

  conditionNotes: string            // free-form; may be empty string
  damageNoted: boolean              // true if staff noted pre-existing or new damage
  damageDescription?: string        // required if damageNoted === true

  photoRefs: string[]               // Firebase Storage paths; 0–10 images
                                    // path: bookings/{bookingId}/checklists/{type}/photos/{filename}

  adminSignature?: string           // Storage path or base64 data URL (DCR-053)
  customerSignature?: string        // Storage path or base64 data URL (DCR-053)

  completedBy: string               // admin userId
  completedAt: Date

  status: ChecklistStatus           // 'submitted' once both signatures captured
  createdAt: Date
  updatedAt: Date
}
```

**Note:** Photos and signatures are stored in Firebase Storage; `photoRefs` and `*Signature` fields store paths. The checklist document itself is small.

---

## Booking Status Transition Guards

The `updateBookingStatus` function in `bookingService.ts` must enforce:

```
confirmed → active:
  - Requires: bookings/{bookingId}/checklists/pickup exists AND status === 'submitted'
  - Error if missing: "Pickup checklist must be submitted before marking booking active."

active → completed:
  - Requires: bookings/{bookingId}/checklists/dropoff exists AND status === 'submitted'
  - Error if missing: "Dropoff checklist must be submitted before marking booking complete."
```

All other transitions remain unchanged.

---

## Booking `status` field — no changes required

The existing `BookingStatus` type (`confirmed`, `active`, `completed`) maps directly to the checklist workflow. No new status values needed.

---

## API Routes

### `POST /api/admin/bookings/[bookingId]/checklists`

Creates or updates a checklist (upsert by type).

**Auth:** Admin only.

**Request body:**
```ts
{
  type: ChecklistType
  fuelLevel: FuelLevel
  odometerMiles: number
  conditionNotes: string
  damageNoted: boolean
  damageDescription?: string     // required if damageNoted true
  photoRefs?: string[]           // Storage paths already uploaded
  status: 'draft' | 'submitted'
}
```

**Server logic:**
```
1. Verify admin role
2. Fetch booking — verify exists and is in correct state:
     pickup → booking.status must be 'confirmed'
     dropoff → booking.status must be 'active'
3. Validate required fields
4. If damageNoted && !damageDescription → 400
5. Upsert checklists/{type} with completedBy, completedAt = now
6. If status === 'submitted' → also trigger booking status transition
     pickup submitted → update booking.status to 'active'
     dropoff submitted → update booking.status to 'completed'
7. Log audit event: 'checklist_submitted'
8. Return { checklist }
```

**State machine shortcut:** Submitting the checklist also advances the booking status in a single request. Admin does not need to make a separate status update call.

---

### `GET /api/admin/bookings/[bookingId]/checklists/[type]`

Fetches a checklist for admin review.

**Auth:** Admin only.

---

### `GET /api/bookings/[bookingId]/checklists/[type]`

Fetches a checklist for the booking owner (customer read-only after signature).

**Auth:** Customer — ownership check via `booking.userId === userId`.

---

## Photo Upload

Photos are uploaded before checklist submission using the existing Firebase Storage client upload pattern.

**Storage path:** `bookings/{bookingId}/checklists/{type}/photos/{filename}`

**Storage rules addition:**
```
match /bookings/{bookingId}/checklists/{type}/photos/{file} {
  allow read: if request.auth != null
    && (isAdmin(request.auth) || isBookingOwner(bookingId, request.auth.uid));
  allow write: if request.auth != null && request.auth.token.role == 'admin'
    && request.resource.size < 15 * 1024 * 1024
    && request.resource.contentType.matches('image/.*');
}
```

Client: after each photo upload completes, add the Storage path to `photoRefs` in local form state. On checklist submit, the full `photoRefs` array is sent.

**Limits:** Maximum 10 photos per checklist. Minimum 1 photo recommended (not enforced server-side; enforced as a UI hint).

---

## Admin UI

### `app/(admin)/admin/bookings/[bookingId]/checklist/[type]/page.tsx`

Full-page form accessible from the booking detail action panel.

```
┌──────────────────────────────────────────────────────────┐
│  Pickup Checklist — 2023 Toyota Camry                    │
│                                                          │
│  Fuel Level      ○ Empty  ○ ¼  ○ ½  ○ ¾  ● Full        │
│                                                          │
│  Odometer        [_______] miles                         │
│                                                          │
│  Condition Notes                                         │
│  [___________________________________________________]   │
│                                                          │
│  Damage noted?   ○ No  ○ Yes                            │
│  (if yes)        [___________________________________]   │
│                                                          │
│  Photos          [+ Add Photo]  (1–10 images)           │
│  [photo thumb] [photo thumb] ...                         │
│                                                          │
│  Signatures  →  DCR-053                                  │
│                                                          │
│  [Save Draft]   [Submit & Mark Active →]                 │
└──────────────────────────────────────────────────────────┘
```

- "Save Draft" saves without submitting (booking status not changed)
- "Submit & Mark Active" submits + transitions booking status in one request
- Admin can edit a draft; once submitted, form becomes read-only
- If `type === 'dropoff'`: button says "Submit & Mark Completed"

---

## Customer-Facing Display

After checklist submission, customers can view (read-only) the checklist from their booking detail page:

```
app/(customer)/dashboard/bookings/[bookingId]/checklist/[type]/page.tsx
```

Shows: fuel level, odometer, condition notes, damage notes (if any), photo gallery, and signature status.

---

## Firestore Security Rules Addition

```firestore
// Checklists — admin write, owner read after submission
match /bookings/{bookingId}/checklists/{type} {
  allow read: if isAdmin()
    || (isSignedIn() && get(/databases/$(database)/documents/bookings/$(bookingId)).data.userId == request.auth.uid
        && resource.data.status == 'submitted');
  allow write: if isAdmin();
}
```

---

## Firestore Index Addition

```json
{
  "collectionGroup": "checklists",
  "fields": [
    { "fieldPath": "bookingId", "order": "ASCENDING" },
    { "fieldPath": "type", "order": "ASCENDING" }
  ]
}
```

---

## Audit Events

| Event | Actor | When |
|---|---|---|
| `checklist_draft_saved` | admin | Draft saved |
| `checklist_submitted` | admin | Status becomes 'submitted' |
| `booking_pickup_completed` | admin | Booking transitions to 'active' |
| `booking_dropoff_completed` | admin | Booking transitions to 'completed' |

---

## Acceptance Criteria (DCR-052, DCR-053)

### DCR-052 — Checklist workflow
- [ ] `POST /api/admin/bookings/[bookingId]/checklists` creates/updates checklist for pickup or dropoff
- [ ] Submitting pickup checklist atomically transitions booking to `active`
- [ ] Submitting dropoff checklist atomically transitions booking to `completed`
- [ ] `confirmed → active` transition in `updateBookingStatus` blocked if pickup checklist not submitted
- [ ] `active → completed` transition blocked if dropoff checklist not submitted
- [ ] Damage noted = true without description → 400
- [ ] Admin can save draft without triggering status transition
- [ ] Photos can be uploaded before checklist submission; `photoRefs` included in submit body
- [ ] Admin booking detail shows checklist status and action button for the relevant stage
- [ ] Customer can view submitted checklist (read-only) from their booking detail

### DCR-053 — Signature capture
- [ ] Admin signature canvas rendered in checklist form (before submit)
- [ ] Customer signature collected on a separate signature-request screen or in-person flow
- [ ] Both signatures stored as Firebase Storage paths or base64 in the checklist document
- [ ] Checklist `status === 'submitted'` requires both `adminSignature` and `customerSignature` to be set
- [ ] Signatures displayed (read-only image) on submitted checklist view

---

## TypeScript Files to Create/Modify

| File | Action |
|---|---|
| `types/checklist.ts` | Create — `VehicleChecklist`, `ChecklistType`, `FuelLevel`, `ChecklistStatus` |
| `types/index.ts` | Modify — re-export from `checklist.ts` |
| `lib/services/checklistService.ts` | Create — `upsertChecklist`, `getChecklist`, `hasSubmittedChecklist` |
| `lib/services/bookingService.ts` | Modify — add checklist guard to `confirmed → active` and `active → completed` transitions |
| `app/api/admin/bookings/[bookingId]/checklists/route.ts` | Create — POST handler |
| `app/api/admin/bookings/[bookingId]/checklists/[type]/route.ts` | Create — GET handler |
| `app/api/bookings/[bookingId]/checklists/[type]/route.ts` | Create — customer GET handler |
| `app/(admin)/admin/bookings/[bookingId]/checklist/[type]/page.tsx` | Create — admin checklist form |
| `app/(customer)/dashboard/bookings/[bookingId]/checklist/[type]/page.tsx` | Create — customer read-only view |
| `components/admin/ChecklistForm.tsx` | Create — admin checklist form component |
| `components/admin/ChecklistView.tsx` | Create — read-only checklist display |
| `firestore.rules` | Modify — add checklists sub-collection rule |
| `firestore.indexes.json` | Modify — add checklists index |
