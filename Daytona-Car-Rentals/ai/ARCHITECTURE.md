# Daytona Car Rentals — Full System Architecture

**Stack:** Next.js 14 App Router · Firebase (Firestore, Auth, Storage) · Stripe
**Date:** 2026-03-26
**Task:** DCR-001

---

## 1. Architecture Overview

### System Topology

```
Browser
  └─ Next.js App (Vercel)
       ├─ App Router (RSC + Client Components)
       ├─ API Routes (/api/*)           ← server-only: Stripe, Firebase Admin
       └─ Firebase SDK (client)         ← Auth, Firestore reads, Storage uploads
            ├─ Firestore                ← bookings, vehicles, users, documents
            ├─ Firebase Auth            ← email/password + Google OAuth
            └─ Firebase Storage         ← license images, insurance PDFs
  └─ Stripe (external)
       ├─ Payment Intents               ← checkout charges
       ├─ Webhooks → /api/stripe/webhook
       └─ Stripe Customer Portal        ← invoice history (optional)
```

### Auth Strategy

- Firebase Auth for identity (email/password + Google)
- Custom claims: `{ role: "admin" | "customer" }`
- Next.js middleware reads the Firebase ID token (cookie) to protect `/admin` and `/dashboard` routes
- Server-side token verification via Firebase Admin SDK in API routes

---

## 2. Folder Structure

```
daytona-car-rentals/
│
├── app/                                # Next.js App Router
│   ├── (public)/                       # Unauthenticated pages
│   │   ├── page.tsx                    # Homepage
│   │   ├── fleet/
│   │   │   ├── page.tsx                # Fleet listing
│   │   │   └── [vehicleId]/
│   │   │       └── page.tsx            # Vehicle detail
│   │   ├── about/page.tsx
│   │   └── contact/page.tsx
│   │
│   ├── (auth)/                         # Auth pages (no nav chrome)
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── forgot-password/page.tsx
│   │
│   ├── (customer)/                     # Protected: logged-in customers
│   │   ├── layout.tsx                  # Auth guard + customer nav
│   │   ├── dashboard/page.tsx          # Booking history
│   │   ├── booking/
│   │   │   ├── [vehicleId]/
│   │   │   │   └── page.tsx            # Multi-step booking form
│   │   │   └── confirmation/
│   │   │       └── [bookingId]/page.tsx
│   │   └── profile/page.tsx            # Personal info + documents
│   │
│   ├── (admin)/                        # Protected: admin only
│   │   ├── layout.tsx                  # Admin auth guard + sidebar
│   │   ├── dashboard/page.tsx          # Overview stats
│   │   ├── bookings/
│   │   │   ├── page.tsx                # All bookings list
│   │   │   └── [bookingId]/page.tsx    # Booking detail + actions
│   │   ├── fleet/
│   │   │   ├── page.tsx                # Manage vehicles
│   │   │   ├── new/page.tsx            # Add vehicle
│   │   │   └── [vehicleId]/page.tsx    # Edit vehicle
│   │   ├── customers/
│   │   │   ├── page.tsx                # Customer list
│   │   │   └── [userId]/page.tsx       # Customer detail + document review
│   │   └── verifications/
│   │       └── page.tsx                # Pending document approvals
│   │
│   ├── api/                            # Server-only API routes
│   │   ├── stripe/
│   │   │   ├── create-payment-intent/route.ts
│   │   │   ├── confirm-payment/route.ts
│   │   │   └── webhook/route.ts        # Stripe webhook handler
│   │   ├── bookings/
│   │   │   ├── create/route.ts
│   │   │   └── [bookingId]/
│   │   │       ├── cancel/route.ts
│   │   │       └── approve/route.ts    # Admin only
│   │   ├── vehicles/
│   │   │   └── availability/route.ts   # Date range conflict check
│   │   └── admin/
│   │       ├── verify-document/route.ts
│   │       └── update-booking-status/route.ts
│   │
│   ├── layout.tsx                      # Root layout (AuthProvider, fonts)
│   └── globals.css
│
├── components/
│   ├── ui/                             # Primitive design system
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Modal.tsx
│   │   ├── Badge.tsx
│   │   ├── Card.tsx
│   │   ├── Spinner.tsx
│   │   └── Toast.tsx
│   │
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   ├── AdminSidebar.tsx
│   │   └── CustomerNav.tsx
│   │
│   ├── fleet/
│   │   ├── VehicleCard.tsx             # Grid card
│   │   ├── VehicleGrid.tsx             # Responsive grid
│   │   ├── VehicleFilters.tsx          # Category, price, availability
│   │   └── VehicleImageGallery.tsx
│   │
│   ├── booking/
│   │   ├── BookingWizard.tsx           # Multi-step controller
│   │   ├── steps/
│   │   │   ├── Step1Dates.tsx          # Date + pickup location
│   │   │   ├── Step2Extras.tsx         # Insurance, GPS, etc.
│   │   │   ├── Step3Documents.tsx      # License + insurance upload
│   │   │   ├── Step4Review.tsx         # Order summary
│   │   │   └── Step5Payment.tsx        # Stripe Elements
│   │   ├── DateRangePicker.tsx
│   │   ├── PriceSummary.tsx
│   │   └── BookingStatusBadge.tsx
│   │
│   ├── documents/
│   │   ├── DocumentUpload.tsx          # Drag-drop + preview
│   │   ├── DocumentPreview.tsx         # Signed URL viewer
│   │   └── VerificationStatus.tsx
│   │
│   ├── admin/
│   │   ├── StatsCard.tsx
│   │   ├── BookingTable.tsx
│   │   ├── CustomerTable.tsx
│   │   ├── VehicleTable.tsx
│   │   ├── DocumentReviewPanel.tsx     # Approve / reject UI
│   │   └── RevenueChart.tsx
│   │
│   └── providers/
│       ├── AuthProvider.tsx            # Firebase auth context
│       ├── BookingProvider.tsx         # Multi-step form state
│       └── ToastProvider.tsx
│
├── lib/
│   ├── firebase/
│   │   ├── client.ts                   # Firebase client SDK init
│   │   ├── admin.ts                    # Firebase Admin SDK init (server-only)
│   │   ├── auth.ts                     # signIn, signOut, getUser helpers
│   │   ├── firestore.ts                # Generic CRUD wrappers
│   │   ├── storage.ts                  # Upload / getSignedUrl helpers
│   │   └── converters.ts               # Firestore data converters
│   │
│   ├── stripe/
│   │   ├── client.ts                   # Stripe.js (browser)
│   │   ├── server.ts                   # Stripe Node SDK (server-only)
│   │   └── webhooks.ts                 # Webhook event handlers
│   │
│   ├── services/
│   │   ├── vehicleService.ts           # Vehicle CRUD + availability
│   │   ├── bookingService.ts           # Create / update / cancel bookings
│   │   ├── userService.ts              # Profile + verification status
│   │   └── documentService.ts          # Upload + verify documents
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useBooking.ts
│   │   ├── useVehicles.ts
│   │   ├── useAvailability.ts
│   │   └── useUpload.ts
│   │
│   ├── utils/
│   │   ├── pricing.ts                  # Daily rate × days + extras
│   │   ├── dateUtils.ts                # Date range helpers
│   │   ├── validation.ts               # Zod schemas
│   │   └── formatters.ts               # Currency, date display
│   │
│   └── middleware/
│       └── withAuth.ts                 # API route auth guard helper
│
├── types/
│   ├── vehicle.ts
│   ├── booking.ts
│   ├── user.ts
│   ├── document.ts
│   ├── payment.ts
│   └── index.ts                        # Re-exports
│
├── middleware.ts                        # Next.js edge middleware (route protection)
├── next.config.ts
├── tailwind.config.ts
├── firebase.json
├── firestore.rules
├── storage.rules
└── .env.local                          # Keys (never committed)
```

---

## 3. Data Flow

### 3a. Booking Flow (Happy Path)

```
1. Customer browses /fleet
   └─ Firestore: query vehicles where available = true
   └─ Client-side filter by category, price, dates

2. Customer selects vehicle → /fleet/[vehicleId]
   └─ Firestore: getDoc vehicles/{vehicleId}

3. Customer clicks "Book Now" → /booking/[vehicleId]
   BookingWizard mounts, BookingContext initialized

   Step 1 — Dates
   └─ Customer picks pickup date, return date, location
   └─ /api/vehicles/availability checks Firestore bookings
      for overlapping [startDate, endDate] on vehicleId
   └─ PriceSummary recalculates on date change

   Step 2 — Extras
   └─ Select add-ons (additional driver, GPS, CDW insurance)
   └─ PriceSummary updates total

   Step 3 — Documents
   └─ DocumentUpload uploads to Firebase Storage:
      storage path: users/{userId}/documents/{type}/{filename}
   └─ Firestore: users/{userId}/documents sub-collection updated
   └─ If previously verified, skip re-upload (show cached status)

   Step 4 — Review
   └─ Show full order summary, total, terms checkbox

   Step 5 — Payment
   └─ /api/stripe/create-payment-intent called (server)
      → creates Stripe PaymentIntent with amount + metadata
      → returns clientSecret
   └─ Stripe Elements renders with clientSecret
   └─ Customer enters card → stripe.confirmCardPayment()
   └─ On success → /api/bookings/create called
      → writes booking to Firestore with status: "pending_verification"
      → sends confirmation email (optional: via Firebase Extension)
   └─ Redirect to /booking/confirmation/[bookingId]

4. Stripe Webhook → /api/stripe/webhook
   └─ payment_intent.succeeded → update booking.paymentStatus = "paid"
   └─ payment_intent.payment_failed → update booking.status = "payment_failed"
```

### 3b. Document Verification Flow

```
1. Customer uploads license + insurance in Step 3 or /profile
   └─ File → Firebase Storage (private bucket)
   └─ Firestore: users/{userId} documents sub-collection
      { type, storageRef, status: "pending", uploadedAt }

2. Admin sees pending verifications in /admin/verifications
   └─ Firestore query: users where any document.status = "pending"

3. Admin clicks customer → DocumentReviewPanel loads
   └─ /api/admin/get-document-url generates signed URL (60min TTL)
   └─ DocumentPreview renders image/PDF in modal

4. Admin approves or rejects
   └─ /api/admin/verify-document (Admin SDK, server-only)
      → updates users/{userId}/documents/{docId}.status = "approved" | "rejected"
      → if rejected: writes rejectionReason
      → if all docs approved: updates users/{userId}.verificationStatus = "verified"

5. Customer sees updated status in /profile
   └─ Realtime Firestore listener on users/{userId}
```

### 3c. Payment Flow Detail

```
                 Browser                  Next.js Server           Stripe
                    │                          │                      │
  "Pay Now" click   │                          │                      │
  ─────────────────►│  POST /api/stripe/       │                      │
                    │  create-payment-intent   │                      │
                    │─────────────────────────►│                      │
                    │                          │  createPaymentIntent │
                    │                          │─────────────────────►│
                    │                          │◄─────────────────────│
                    │    { clientSecret }       │   { id, clientSecret}│
                    │◄─────────────────────────│                      │
                    │                          │                      │
  stripe.confirm    │                          │                      │
  CardPayment()     │─────────────────────────────────────────────────►
                    │◄────────────────────────────────────────────────│
                    │   { status: "succeeded"} │                      │
                    │                          │                      │
  POST /api/        │                          │                      │
  bookings/create   │─────────────────────────►│                      │
                    │  (with paymentIntentId)  │  verify PI status    │
                    │                          │─────────────────────►│
                    │                          │◄─────────────────────│
                    │  { bookingId }            │  write to Firestore  │
                    │◄─────────────────────────│                      │
                    │                          │                      │
                    │                   [async] POST /api/stripe/webhook
                    │                          │◄─────────────────────│
                    │                          │ payment_intent.       │
                    │                          │ succeeded             │
                    │                          │  update booking       │
                    │                          │  paymentStatus="paid" │
```

---

## 4. Firestore Data Schema

### Collections

```
vehicles/{vehicleId}
  ├─ make: string
  ├─ model: string
  ├─ year: number
  ├─ category: "economy" | "suv" | "luxury" | "van" | "truck"
  ├─ dailyRate: number                  // USD cents
  ├─ depositAmount: number              // USD cents
  ├─ images: string[]                   // Storage paths
  ├─ features: string[]
  ├─ seats: number
  ├─ transmission: "auto" | "manual"
  ├─ mileagePolicy: "unlimited" | number
  ├─ available: boolean
  ├─ location: string
  └─ createdAt: Timestamp

bookings/{bookingId}
  ├─ userId: string                     // ref → users
  ├─ vehicleId: string                  // ref → vehicles
  ├─ startDate: Timestamp
  ├─ endDate: Timestamp
  ├─ pickupLocation: string
  ├─ returnLocation: string
  ├─ extras: { gps: boolean, additionalDriver: boolean, cdw: boolean }
  ├─ totalAmount: number                // USD cents
  ├─ depositAmount: number              // USD cents
  ├─ status: "pending_verification" | "confirmed" | "active" | "completed" | "cancelled"
  ├─ paymentStatus: "pending" | "paid" | "refunded" | "failed"
  ├─ stripePaymentIntentId: string
  ├─ createdAt: Timestamp
  └─ updatedAt: Timestamp

users/{userId}
  ├─ email: string
  ├─ displayName: string
  ├─ phone: string
  ├─ dateOfBirth: string
  ├─ verificationStatus: "unverified" | "pending" | "verified" | "rejected"
  ├─ role: "customer" | "admin"
  ├─ stripeCustomerId: string
  ├─ createdAt: Timestamp
  └─ documents/ (sub-collection)
       └─ {docId}
            ├─ type: "license" | "insurance"
            ├─ storageRef: string        // Firebase Storage path
            ├─ status: "pending" | "approved" | "rejected"
            ├─ rejectionReason?: string
            ├─ reviewedBy?: string       // admin userId
            ├─ uploadedAt: Timestamp
            └─ reviewedAt?: Timestamp
```

### Firestore Security Rules Summary

- `vehicles`: read = public; write = admin only
- `bookings`: read/write = owner userId or admin
- `users/{userId}`: read/write = self or admin
- `users/{userId}/documents`: read = self or admin; write = self (upload) or admin (status update)

---

## 5. Key Modules

| Module | File | Responsibility |
|---|---|---|
| AuthProvider | `components/providers/AuthProvider.tsx` | Firebase onAuthStateChanged, exposes `user`, `role`, `loading` |
| BookingWizard | `components/booking/BookingWizard.tsx` | Manages step state, validates before advancing |
| BookingProvider | `components/providers/BookingProvider.tsx` | Global booking form state (dates, extras, vehicleId) |
| vehicleService | `lib/services/vehicleService.ts` | Firestore queries with date-range availability checks |
| bookingService | `lib/services/bookingService.ts` | Create/cancel/update booking + transaction-safe writes |
| documentService | `lib/services/documentService.ts` | Upload to Storage, write metadata, get signed URL |
| Stripe webhook | `app/api/stripe/webhook/route.ts` | Validates Stripe signature, updates booking on events |
| Middleware | `middleware.ts` | Reads `__session` cookie, redirects unauthenticated to /login |
| withAuth | `lib/middleware/withAuth.ts` | Wraps API routes: verifies Firebase ID token via Admin SDK |

---

## 6. Admin Dashboard Structure

### Screens

```
/admin/dashboard
  └─ KPI cards: total bookings, revenue this month, pending verifications, active rentals
  └─ Recent bookings table (last 10)
  └─ Revenue chart (last 30 days)

/admin/bookings
  └─ Full bookings table: filter by status, date range, search by customer/vehicle
  └─ Row actions: view, approve, cancel, refund

/admin/bookings/[bookingId]
  └─ Full booking detail
  └─ Customer info + verification status
  └─ Vehicle info
  └─ Payment breakdown
  └─ Status timeline
  └─ Actions: Confirm, Mark Active, Mark Completed, Cancel + Refund

/admin/fleet
  └─ Vehicle list: category filter, availability toggle
  └─ Quick edit: daily rate, availability, images

/admin/fleet/new  &  /admin/fleet/[vehicleId]
  └─ Vehicle form: all fields + image upload to Storage

/admin/customers
  └─ Customer list: filter by verification status
  └─ Columns: name, email, verification status, booking count, joined date

/admin/customers/[userId]
  └─ Customer profile
  └─ Document review panel (license + insurance side-by-side)
  └─ Approve / Reject with optional note
  └─ Booking history

/admin/verifications
  └─ Priority queue: all users with status = "pending"
  └─ Quick approve/reject inline
```

---

## 7. Environment Variables

```bash
# Firebase (public — safe for browser)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (server-only — never expose)
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# App
NEXT_PUBLIC_APP_URL=https://daytonacarrentals.com
```

---

## 8. Risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | Double-booking race condition | High | Use Firestore transaction in `bookingService.create()` to atomically check availability and write |
| R2 | Payment confirmed but booking write fails | High | Always verify PaymentIntent status server-side before writing; Stripe webhook as idempotent fallback |
| R3 | Firebase Storage documents accessed without auth | High | Storage rules enforce `request.auth.uid == userId`; admin uses signed URLs with short TTL |
| R4 | Admin routes exposed to customers | High | Middleware checks `role == "admin"` claim; API routes re-verify via Admin SDK |
| R5 | Stale availability (cached Firestore reads) | Medium | Availability check is always server-side in `/api/vehicles/availability` at booking creation |
| R6 | Stripe webhook replay / tampering | Medium | Verify `stripe-signature` header with `STRIPE_WEBHOOK_SECRET`; idempotency via PaymentIntent ID |
| R7 | Large document uploads blocking UI | Low | Upload with progress bar; limit file size to 10MB; validate MIME type client + server |
| R8 | Firebase private key in client bundle | High | Admin SDK only ever imported in files under `app/api/` — Next.js tree-shakes it out of client |

---

## 9. Acceptance Criteria for Codex

### DCR-002 — Initialize project
- [ ] `npx create-next-app` with App Router, TypeScript, Tailwind
- [ ] All folders from structure above created (empty files with barrel exports ok)
- [ ] `next.config.ts` sets `images.domains` for Firebase Storage
- [ ] `.env.local.example` with all keys listed above (no real values)

### DCR-004 — UI component library
- [ ] All components in `components/ui/` are typed with Props interfaces
- [ ] Button has variants: `primary`, `secondary`, `ghost`, `danger`
- [ ] All components support `className` prop override
- [ ] No hardcoded colors — use Tailwind design tokens

### DCR-012 — Multi-step booking form
- [ ] 5 steps render correctly in order
- [ ] Cannot advance to next step if current step validation fails (Zod)
- [ ] Step 3 skips upload if documents are already verified
- [ ] BookingContext state persists across steps (no data loss on back)
- [ ] Step 5 only renders after PaymentIntent clientSecret is received

### DCR-013 — Document uploads
- [ ] Accepts: JPEG, PNG, PDF; max 10MB
- [ ] Shows upload progress bar
- [ ] Previews image inline; PDF shows filename + size
- [ ] Firestore document record written with `status: "pending"` after upload
- [ ] Re-upload replaces existing Storage file at same path

### DCR-015 — Firestore models
- [ ] All Firestore writes use typed converters (`converters.ts`)
- [ ] `bookingService.create()` uses a transaction to prevent double-booking
- [ ] All queries have corresponding Firestore composite indexes defined in `firestore.indexes.json`

### DCR-017 — Stripe integration
- [ ] PaymentIntent created server-side only (never in browser)
- [ ] Amount computed server-side from Firestore vehicle data (not trusted from client)
- [ ] Webhook verifies signature before processing
- [ ] Booking not written until PaymentIntent status confirmed as `succeeded`
- [ ] Refund path: cancel booking → Stripe refund → update `paymentStatus`

### DCR-019 — Admin dashboard
- [ ] `/admin` routes redirect non-admin users to `/`
- [ ] All tables are paginated (25 rows default)
- [ ] Booking status changes write audit trail to Firestore

### DCR-020 — Document verification
- [ ] Document preview uses signed URL (not public Storage URL)
- [ ] Approve/reject updates both document sub-collection and parent `verificationStatus`
- [ ] Admin cannot approve their own documents
- [ ] Rejection reason is required when rejecting
