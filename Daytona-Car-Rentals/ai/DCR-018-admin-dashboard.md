# DCR-018 — Admin Dashboard Spec

**Owner:** Claude
**Status:** Complete
**Depends on:** DCR-003, DCR-014

---

## Access Control

- All `/admin` routes are guarded by Next.js `middleware.ts`
- Reads `__session` cookie → verifies Firebase ID token → checks `role === 'admin'`
- Non-admin users redirected to `/`
- All admin API routes re-verify via Firebase Admin SDK (`withAuth` + role check)

---

## Layout

**File:** `app/(admin)/layout.tsx`

```
┌─────────────────────────────────────────────────────┐
│ SIDEBAR (256px, sticky, full height)                │
│  Logo + "Admin"                                     │
│  ─────────────────                                  │
│  📊 Dashboard                                       │
│  📋 Bookings                                        │
│  🚗 Fleet                                           │
│  👥 Customers                                       │
│  🔍 Verifications   [badge: N pending]              │
│  ─────────────────                                  │
│  ⚙  Settings (future)                              │
│  ↩  Back to Site                                    │
│  Sign Out                                           │
├─────────────────────────────────────────────────────┤
│ MAIN CONTENT AREA                                   │
│  [Page title]  [Action buttons]                     │
│  ─────────────────────────────                      │
│  [Page content]                                     │
└─────────────────────────────────────────────────────┘
```

**Mobile:** Sidebar collapses to hamburger → slide-in drawer.

`AdminSidebar` uses Next.js `usePathname` to highlight active link.

Pending verification count on sidebar badge: realtime Firestore listener — `users` where `verificationStatus === 'pending'`.

---

## Screen 1: `/admin/dashboard`

### KPI Cards (top row)

**File:** `components/admin/StatsCard.tsx`

```ts
interface StatsCardProps {
  title: string
  value: string | number
  change?: string       // e.g. "+12% vs last month"
  changeType?: 'positive' | 'negative' | 'neutral'
  icon: LucideIcon
}
```

4 cards in a row:

| Card | Value source | Icon |
|---|---|---|
| Total Bookings (this month) | Firestore count query | Calendar |
| Revenue (this month) | Sum of `booking.pricing.totalAmount` where `paymentStatus: 'paid'` | DollarSign |
| Pending Verifications | Count of `users` where `verificationStatus: 'pending'` | Clock |
| Active Rentals | Count of `bookings` where `status: 'active'` | Car |

### Recent Bookings Table

Last 10 bookings ordered by `createdAt desc`.

Columns: `#ID` · `Customer` · `Vehicle` · `Dates` · `Total` · `Status` · `Actions`

"View All →" link → `/admin/bookings`

### Revenue Chart

**File:** `components/admin/RevenueChart.tsx`

- 30-day bar chart of daily revenue
- Library: `recharts` (lightweight, React-native)
- Data: query `bookings` where `createdAt` >= 30 days ago, `paymentStatus: 'paid'` → group by date client-side
- X-axis: dates; Y-axis: USD; bar color: `brand-500`

---

## Screen 2: `/admin/bookings`

### Filters / Search

```
[Search by customer name or booking ID]   [Status ▾]   [Date range]   [Export CSV]
```

- Search: client-side filter on loaded data (or Firestore `orderBy` + `startAt` for large datasets)
- Status filter: All · Pending Verification · Confirmed · Active · Completed · Cancelled · Payment Failed
- Date range: filter `startDate` field

### Table

**File:** `components/admin/BookingTable.tsx`

Columns:
| Column | Notes |
|---|---|
| Booking ID | Short ID (first 8 chars of Firestore doc ID), monospace |
| Customer | Name + email |
| Vehicle | Year Make Model |
| Dates | Apr 1 – Apr 6 (5 days) |
| Total | Formatted USD |
| Deposit Paid | Formatted USD |
| Status | `<BookingStatusBadge />` |
| Actions | View · Cancel |

- Pagination: 25 rows per page, page controls at bottom
- Row click → `/admin/bookings/[bookingId]`
- "Cancel" button opens confirmation modal before action

---

## Screen 3: `/admin/bookings/[bookingId]`

Full booking detail with status management.

### Layout

```
← Back to Bookings                           [Status badge]

┌──────────────────────┐  ┌──────────────────────────────┐
│  BOOKING DETAILS     │  │  CUSTOMER                    │
│  ID: DCR-XXXXXX      │  │  John Doe                    │
│  Created: Apr 1      │  │  john@email.com              │
│  Dates: Apr 1–6      │  │  Verification: ✓ Verified    │
│  Location: Airport   │  │  [View Profile →]            │
│                      │  └──────────────────────────────┘
│  VEHICLE             │
│  2023 Toyota Camry   │  ┌──────────────────────────────┐
│  Economy · 5 seats   │  │  PAYMENT                     │
│                      │  │  Deposit Paid: $200          │
│  EXTRAS              │  │  Total: $600                 │
│  ✓ GPS               │  │  Balance at pickup: $400     │
│  ✓ CDW               │  │  PI ID: pi_3XxxxxXx          │
└──────────────────────┘  │  Status: Paid ✓              │
                          └──────────────────────────────┘

ACTIONS
[Confirm Booking]   [Mark as Active]   [Mark Completed]   [Cancel + Refund]

STATUS TIMELINE
● Booking Created         Apr 1, 2026 10:32 AM
● Payment Received        Apr 1, 2026 10:32 AM
● Documents Verified      Apr 1, 2026 11:15 AM
○ Confirmed               —
○ Active                  —
○ Completed               —
```

### Action rules

| Button | Shows when | Action |
|---|---|---|
| Confirm Booking | status: `pending_verification`, docs verified | → `confirmed` |
| Mark as Active | status: `confirmed` | → `active` |
| Mark Completed | status: `active` | → `completed` |
| Cancel + Refund | status: not `completed` or `cancelled` | → modal: confirm → Stripe refund → `cancelled` |

All actions call `/api/admin/update-booking-status` and write an audit trail entry.

### Audit Trail

Stored as a sub-collection: `bookings/{id}/auditLog/{entryId}`

```ts
interface AuditEntry {
  action: string           // e.g. "status_changed"
  from: string
  to: string
  adminId: string
  adminName: string
  timestamp: Timestamp
  note?: string
}
```

Rendered as a timeline in the booking detail page.

---

## Screen 4: `/admin/fleet`

### Vehicle List

**File:** `components/admin/VehicleTable.tsx`

Columns: Image thumbnail · Make/Model/Year · Category · Daily Rate · Seats · Available (toggle) · Actions (Edit)

- "Add Vehicle" button → `/admin/fleet/new`
- Availability toggle: immediate Firestore update (`vehicles/{id}.available = true/false`)
- Pagination: 25 per page

### Add / Edit Vehicle: `/admin/fleet/new` + `/admin/fleet/[vehicleId]`

Full vehicle form:

```
Make *          Model *         Year *
[input]         [input]         [input]

Category *      Daily Rate *    Deposit *
[select]        [$ input]       [$ input]

Seats *         Transmission *  Mileage Policy
[number]        [auto/manual]   [unlimited / N miles/day]

Location *
[input]

Description
[textarea]

Features (comma-separated or tag input)
[tag input]

Images
[multi-file upload → Firebase Storage → vehicles/{vehicleId}/]
[shows uploaded thumbnails with remove button]

[Cancel]        [Save Vehicle]
```

- Uses `react-hook-form` + Zod validation
- Image upload: `uploadBytesResumable` with progress; multiple files allowed; max 5 images
- On save: `vehicleService.create()` or `vehicleService.update()`

---

## Screen 5: `/admin/customers`

### Customer List

**File:** `components/admin/CustomerTable.tsx`

Columns: Name · Email · Verification Status · Total Bookings · Joined Date · Actions (View)

Filters: Verification Status (All / Unverified / Pending / Verified / Rejected)

Pagination: 25 per page.

---

## Screen 6: `/admin/customers/[userId]`

### Layout

```
← Back to Customers

[Customer name]   [Verification badge]

┌──────────────────────┐  ┌──────────────────────────────┐
│  PROFILE             │  │  DOCUMENT REVIEW             │
│  Email               │  │  ┌────────────────────────┐  │
│  Phone               │  │  │ Driver's License       │  │
│  DOB                 │  │  │ [Preview image/PDF]    │  │
│  Address             │  │  │ Uploaded: Apr 1        │  │
│  Stripe Customer ID  │  │  │ Status: Pending        │  │
└──────────────────────┘  │  └────────────────────────┘  │
                          │  ┌────────────────────────┐  │
                          │  │ Insurance Card         │  │
BOOKING HISTORY           │  │ [Preview image/PDF]    │  │
[BookingTable filtered    │  │ Uploaded: Apr 1        │  │
 by userId]               │  │ Status: Pending        │  │
                          │  └────────────────────────┘  │
                          │                              │
                          │  [✓ Approve All]  [✗ Reject] │
                          └──────────────────────────────┘
```

### `DocumentReviewPanel`

**File:** `components/admin/DocumentReviewPanel.tsx`

```ts
interface DocumentReviewPanelProps {
  userId: string
  documents: UserDocument[]
}
```

**Document preview:**
1. Click document card → call `/api/admin/get-document-signed-url`
2. API returns a Firebase Storage signed URL (60min TTL) — never exposed as public URL
3. Image: render in `<img>` or full-screen modal
4. PDF: render in `<iframe>` or show download link

**Approve / Reject:**
- "Approve All" button: approves both documents + sets `users/{userId}.verificationStatus = 'verified'`
- "Reject" button: opens modal asking for rejection reason (required text field) → rejects selected doc + optionally sets `verificationStatus = 'rejected'`
- Admin cannot act on their own documents (checked: `adminId !== userId`)

**API route:** `POST /api/admin/verify-document`

```ts
{
  userId: string
  docType: 'drivers_license' | 'insurance_card'
  action: 'approve' | 'reject'
  rejectionReason?: string    // required when action === 'reject'
}
```

Server logic:
1. Verify admin role
2. Update `users/{userId}/documents/{docType}`:
   `{ status, rejectionReason?, reviewedBy, reviewedAt }`
3. Check if all docs approved → update `users/{userId}.verificationStatus = 'verified'`
4. If any doc rejected → update `users/{userId}.verificationStatus = 'rejected'`

---

## Screen 7: `/admin/verifications`

Priority queue for document review.

### Layout

```
Pending Verifications  (N)
[Newest first ▾]

┌────────────────────────────────────────────────────────────┐
│  John Doe · john@email.com                   Apr 1, 3:14pm │
│  2 documents pending · [Review →]                         │
├────────────────────────────────────────────────────────────┤
│  Sarah M. · sarah@email.com                  Apr 1, 2:50pm │
│  1 document pending (license) · [Review →]                │
└────────────────────────────────────────────────────────────┘
```

- Firestore query: `users` where `verificationStatus === 'pending'` order by `updatedAt desc`
- Realtime listener (Firestore `onSnapshot`) so list updates as items are reviewed
- "Review →" links to `/admin/customers/[userId]` (the document review panel above)
- Empty state: "All caught up! No pending verifications." + checkmark illustration

---

## Acceptance Criteria (Codex DCR-019, DCR-020)

- [ ] All `/admin` routes redirect non-admins to `/`
- [ ] Sidebar badge shows live count of pending verifications (realtime)
- [ ] Dashboard KPI cards load correct values
- [ ] Revenue chart renders last 30 days of paid bookings
- [ ] Bookings table paginates at 25 rows; status filter works
- [ ] Booking detail shows correct status + audit timeline
- [ ] All booking status transitions respect the allowed-state rules
- [ ] Cancel action issues Stripe refund before updating Firestore
- [ ] Fleet CRUD: add/edit/delete vehicle with image upload
- [ ] Availability toggle updates Firestore immediately
- [ ] Document preview uses signed URL (not public Storage URL)
- [ ] Approve updates document status AND parent verificationStatus
- [ ] Reject requires non-empty reason; shows reason to customer in profile
- [ ] Admin cannot approve/reject their own documents
- [ ] Verifications queue updates in realtime without page refresh
- [ ] All tables have empty state messages
