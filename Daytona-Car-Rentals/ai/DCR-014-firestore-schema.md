# DCR-014 — Firestore Schema

**Owner:** Claude
**Status:** Complete
**Depends on:** DCR-001

---

## Collections

### `vehicles/{vehicleId}`

```ts
interface Vehicle {
  id: string                        // Firestore doc ID
  make: string                      // e.g. "Toyota"
  model: string                     // e.g. "Camry"
  year: number                      // e.g. 2023
  category: VehicleCategory         // see enum below
  dailyRate: number                 // USD cents (e.g. 8500 = $85.00)
  depositAmount: number             // USD cents
  images: string[]                  // Firebase Storage paths (ordered, first = hero)
  features: string[]                // e.g. ["Bluetooth", "Backup Camera"]
  seats: number
  transmission: 'automatic' | 'manual'
  mileagePolicy: 'unlimited' | number  // number = miles/day limit
  available: boolean                // soft toggle; does NOT mean booked
  location: string                  // pickup location label
  description: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

type VehicleCategory = 'economy' | 'suv' | 'luxury' | 'van' | 'truck' | 'convertible'
```

**Indexes required:**
- `(available ASC, category ASC)` — fleet page filter
- `(available ASC, dailyRate ASC)` — price sort
- `(location ASC, available ASC)` — location filter

---

### `bookings/{bookingId}`

```ts
interface Booking {
  id: string
  userId: string                    // ref → users/{userId}
  vehicleId: string                 // ref → vehicles/{vehicleId}

  // Dates stored as Timestamps for range queries
  startDate: Timestamp
  endDate: Timestamp
  totalDays: number                 // derived; stored for display

  pickupLocation: string
  returnLocation: string

  extras: BookingExtras
  pricing: BookingPricing

  status: BookingStatus
  paymentStatus: PaymentStatus

  stripePaymentIntentId: string     // for refund / lookup
  stripeCustomerId: string          // denormalized for speed

  adminNotes?: string
  cancellationReason?: string
  cancelledBy?: 'customer' | 'admin'

  createdAt: Timestamp
  updatedAt: Timestamp
  confirmedAt?: Timestamp
  cancelledAt?: Timestamp
  completedAt?: Timestamp
}

interface BookingExtras {
  additionalDriver: boolean
  gps: boolean
  childSeat: boolean
  cdw: boolean                      // Collision Damage Waiver
}

interface BookingPricing {
  dailyRate: number                 // USD cents — snapshot at booking time
  totalDays: number
  baseAmount: number                // dailyRate × totalDays
  extrasAmount: number              // sum of selected extras
  depositAmount: number             // held amount
  totalAmount: number               // baseAmount + extrasAmount
  // All in USD cents
}

type BookingStatus =
  | 'pending_verification'          // docs not yet approved
  | 'pending_payment'               // awaiting payment confirmation
  | 'confirmed'                     // paid + docs verified
  | 'active'                        // vehicle picked up
  | 'completed'                     // vehicle returned
  | 'cancelled'
  | 'payment_failed'

type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'partially_refunded' | 'failed'
```

**Indexes required:**
- `(userId ASC, createdAt DESC)` — customer booking history
- `(vehicleId ASC, startDate ASC, endDate ASC)` — availability conflict check
- `(status ASC, createdAt DESC)` — admin bookings list by status
- `(paymentStatus ASC, createdAt DESC)` — admin payment filter
- `(vehicleId ASC, status ASC)` — active bookings per vehicle

---

### `users/{userId}`

```ts
interface User {
  id: string                        // = Firebase Auth UID
  email: string
  displayName: string
  phone: string
  dateOfBirth: string               // ISO date string "YYYY-MM-DD"
  address?: UserAddress

  verificationStatus: VerificationStatus
  role: 'customer' | 'admin'

  stripeCustomerId?: string         // set after first payment

  createdAt: Timestamp
  updatedAt: Timestamp
  lastLoginAt?: Timestamp
}

interface UserAddress {
  line1: string
  line2?: string
  city: string
  state: string
  zip: string
  country: string
}

type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected'
```

**Indexes required:**
- `(verificationStatus ASC, createdAt DESC)` — admin verification queue
- `(role ASC, createdAt DESC)` — admin customer list

---

### `users/{userId}/documents/{docId}` (sub-collection)

```ts
interface UserDocument {
  id: string
  type: DocumentType
  storageRef: string                // Firebase Storage path
  fileName: string                  // original filename for display
  fileSize: number                  // bytes
  mimeType: string                  // "image/jpeg" | "image/png" | "application/pdf"

  status: DocumentStatus
  rejectionReason?: string
  reviewedBy?: string               // admin userId
  uploadedAt: Timestamp
  reviewedAt?: Timestamp
}

type DocumentType = 'drivers_license' | 'insurance_card'
type DocumentStatus = 'pending' | 'approved' | 'rejected'
```

**Note:** One document of each type per user. If re-uploaded, overwrite the existing doc of that type (same `docId = type`).

---

### `extras_pricing` (single document: `extras_pricing/current`)

Admin-editable pricing for add-ons. Stored in Firestore so admin can update without a deploy.

```ts
interface ExtrasPricing {
  additionalDriver: number          // USD cents per day
  gps: number                       // USD cents per day
  childSeat: number                 // USD cents per day
  cdw: number                       // USD cents per day
  updatedAt: Timestamp
}
```

---

## Security Rules

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helpers
    function isSignedIn() {
      return request.auth != null;
    }
    function isAdmin() {
      return isSignedIn() && request.auth.token.role == 'admin';
    }
    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    // Vehicles — public read, admin write
    match /vehicles/{vehicleId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Bookings — owner or admin
    match /bookings/{bookingId} {
      allow read: if isAdmin() || (isSignedIn() && resource.data.userId == request.auth.uid);
      allow create: if isSignedIn() && request.resource.data.userId == request.auth.uid;
      allow update: if isAdmin()
        || (isSignedIn()
            && resource.data.userId == request.auth.uid
            && request.resource.data.status == 'cancelled');  // customer can only cancel
      allow delete: if false;
    }

    // Users — self or admin
    match /users/{userId} {
      allow read: if isOwner(userId) || isAdmin();
      allow create: if isOwner(userId);
      allow update: if isOwner(userId) || isAdmin();
      allow delete: if false;

      // Documents sub-collection
      match /documents/{docId} {
        allow read: if isOwner(userId) || isAdmin();
        allow create, update: if isOwner(userId)        // customer uploads
          || isAdmin();                                  // admin updates status
        allow delete: if false;
      }
    }

    // Extras pricing — public read, admin write
    match /extras_pricing/{doc} {
      allow read: if true;
      allow write: if isAdmin();
    }
  }
}
```

---

## Storage Rules

```firestore
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    // User documents — private, only owner + admin
    match /users/{userId}/documents/{allPaths=**} {
      allow read: if request.auth != null
        && (request.auth.uid == userId || request.auth.token.role == 'admin');
      allow write: if request.auth != null
        && request.auth.uid == userId
        && request.resource.size < 10 * 1024 * 1024    // 10MB max
        && request.resource.contentType.matches('image/.*|application/pdf');
    }

    // Vehicle images — public read, admin write
    match /vehicles/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.role == 'admin';
    }
  }
}
```

---

## Firestore Indexes (`firestore.indexes.json`)

```json
{
  "indexes": [
    {
      "collectionGroup": "vehicles",
      "fields": [
        { "fieldPath": "available", "order": "ASCENDING" },
        { "fieldPath": "category", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "vehicles",
      "fields": [
        { "fieldPath": "available", "order": "ASCENDING" },
        { "fieldPath": "dailyRate", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "bookings",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "bookings",
      "fields": [
        { "fieldPath": "vehicleId", "order": "ASCENDING" },
        { "fieldPath": "startDate", "order": "ASCENDING" },
        { "fieldPath": "endDate", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "bookings",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "users",
      "fields": [
        { "fieldPath": "verificationStatus", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## Availability Check Query

```ts
// bookingService.ts — check for overlapping bookings
// Overlaps when: existing.startDate < requested.endDate AND existing.endDate > requested.startDate

const conflicts = await db.collection('bookings')
  .where('vehicleId', '==', vehicleId)
  .where('status', 'in', ['confirmed', 'active', 'pending_verification', 'pending_payment'])
  .where('startDate', '<', requestedEndDate)
  .get()

// Then filter in memory: conflict.endDate > requestedStartDate
// Firestore cannot do two inequality filters on different fields in one query
```

**Important:** Firestore does not support inequality filters on two different fields in a single query. The second bound (`endDate >`) must be filtered in application code after fetching results. The composite index on `(vehicleId, startDate)` covers the server-side filter.

---

## TypeScript Type Files

```
types/
  vehicle.ts    — Vehicle, VehicleCategory
  booking.ts    — Booking, BookingExtras, BookingPricing, BookingStatus, PaymentStatus
  user.ts       — User, UserAddress, VerificationStatus
  document.ts   — UserDocument, DocumentType, DocumentStatus
  payment.ts    — ExtrasPricing
  index.ts      — re-exports all
```

All Firestore reads use typed data converters:

```ts
// lib/firebase/converters.ts
import { FirestoreDataConverter } from 'firebase/firestore'
import type { Vehicle } from '@/types/vehicle'

export const vehicleConverter: FirestoreDataConverter<Vehicle> = {
  toFirestore: (vehicle) => vehicle,
  fromFirestore: (snapshot, options) => ({
    id: snapshot.id,
    ...snapshot.data(options),
  }) as Vehicle,
}
```
