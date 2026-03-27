# DCR-031 — Customer Portal Design

**Owner:** Claude (design)
**Implementer:** Codex (DCR-032)
**Status:** Complete

---

## Overview

The customer portal lives under `app/(customer)/` and is protected by the existing token-verifying layout. It gives customers a single place to track bookings, manage verification documents, update their profile, and control SMS preferences.

The existing `app/(customer)/dashboard/page.tsx` is a stub — DCR-032 replaces its contents entirely. The confirmation page at `booking/confirmation/[bookingId]` is already built and stays as-is.

---

## Information Architecture

```
/dashboard                        — Overview: verification status, upcoming bookings
/dashboard/bookings               — Full booking history
/dashboard/bookings/[bookingId]   — Booking detail + cancellation
/dashboard/documents              — Document upload/re-upload + status
/dashboard/profile                — Profile edit + SMS opt-in
```

---

## Portal Layout

### Update `app/(customer)/layout.tsx`

Add a portal sidebar alongside the existing token verification logic. The sidebar must be a `'use client'` component (needs `usePathname` for active state).

**New component: `components/layout/CustomerSidebar.tsx`**

Four navigation items:

| Label | Icon (lucide) | href |
|---|---|---|
| Dashboard | `LayoutDashboard` | `/dashboard` |
| My Bookings | `ClipboardList` | `/dashboard/bookings` |
| Documents | `FileCheck` | `/dashboard/documents` |
| Profile | `UserCircle` | `/dashboard/profile` |

Matches the `AdminSidebar` visual pattern: `rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm`, active link uses `bg-orange-50 text-orange-600`. Include a "Browse Fleet" link at the bottom pointing to `/fleet`.

**Updated layout wrapper:**

```tsx
<div className="mx-auto grid min-h-[calc(100vh-8rem)] w-full max-w-6xl gap-6 px-6 py-10 lg:grid-cols-[220px_1fr]">
  <CustomerSidebar />
  <div>{children}</div>
</div>
```

---

## Pages

### 1. Dashboard (`/dashboard`)

**RSC.** Replace the stub entirely.

Parallel fetch:
```ts
const [profile, verificationSummary, bookings] = await Promise.all([
  getUserProfile(userId),
  getUserVerificationSummary(userId),
  listBookingsForUser(userId),
]);
```

`userId` comes from verifying the session token in the layout — pass it down via a server action or re-verify in the page. See "Accessing userId in RSC pages" below.

**Layout — three sections:**

**Section 1 — Verification status banner**

| Status | Appearance | Message |
|---|---|---|
| `unverified` | Amber border/bg | "Complete your verification to unlock booking. Upload your driver's license and insurance card." + "Upload Documents" button → `/dashboard/documents` |
| `pending` | Blue border/bg | "Your documents are under review. We'll email you once verified." |
| `verified` | Emerald border/bg | "You're verified and ready to book." |
| `rejected` | Red border/bg | "One or more documents need attention." + "Review Documents" button → `/dashboard/documents` |

**Section 2 — Upcoming bookings**

Show up to 3 bookings with `status` in `["pending_verification", "confirmed", "active"]`, sorted by `startDate` ascending. Each card shows: vehicle name (look up from vehicleId), dates, status badge, link to booking detail. If none: "No upcoming bookings. [Browse the fleet →]"

**Section 3 — Quick stats row**

Three small stat cards:
- Total bookings (all time)
- Active rental (show vehicle + return date if status is `active`, else "None")
- Member since (`profile.createdAt` formatted as `MMM YYYY`)

---

### 2. My Bookings (`/dashboard/bookings`)

**RSC.**

Fetch all bookings for the user via `listBookingsForUser(userId)`, sorted by `createdAt` descending. For each booking, also look up the vehicle name.

**Per-booking row** (table or card list — card list preferred for mobile):
- Vehicle name + year
- Date range
- `BookingStatusBadge` (reuse admin component)
- Total amount charged at booking
- Link to `/dashboard/bookings/[bookingId]`

Empty state: "You haven't made any bookings yet. [Browse the fleet →]"

---

### 3. Booking Detail (`/dashboard/bookings/[bookingId]`)

**RSC + one client component for cancellation.**

Fetch booking + vehicle. Redirect to `/dashboard/bookings` if `booking.userId !== userId` (ownership check — do not use `notFound()` to avoid leaking existence).

**Layout — two columns on desktop:**

Left column:
- Booking info card: ID, dates, pickup/return location, vehicle
- Status timeline (reuse `getBookingTimeline` from `adminService`)
- Pricing summary: deposit paid, total, balance due at pickup

Right column:
- Status card with `BookingStatusBadge`
- **Cancellation panel** (`'use client'` component: `CustomerCancelPanel`)

**`CustomerCancelPanel` props:**
```ts
{ bookingId: string; canCancel: boolean; }
```

`canCancel = !["active", "completed", "cancelled"].includes(booking.status)` — same logic as admin.

Behaviour:
- If `canCancel` is false: show "This booking can no longer be cancelled."
- If `canCancel` is true: show "Cancel Booking" button → opens confirmation modal (no reason required from customers, unlike admin). On confirm, calls `PATCH /api/bookings/[bookingId]/cancel`. On success, `router.refresh()`.

---

### 4. Documents (`/dashboard/documents`)

**RSC wrapper + client upload components.**

Fetch verification summary via `getUserVerificationSummary(userId)`. Find the `drivers_license` and `insurance_card` documents from the result.

**Per-document card** (one for each type):

```
┌─────────────────────────────────────────────┐
│ Driver's License                   [status badge]  │
│ Last uploaded: Mar 15, 2026                        │
│ ─────────────────────────────────────────────────  │
│ [Rejection reason if rejected, in red]             │
│                                                    │
│ [DocumentUpload component — reuses existing]       │
└─────────────────────────────────────────────────┘
```

Status badge colours:
- `pending` → amber
- `approved` → emerald
- `rejected` → red
- Not uploaded yet → slate "Not uploaded"

Show the `DocumentUpload` component unconditionally — customers can re-upload at any time to replace a rejected document. On upload complete, call `router.refresh()` (the component's `onUploadComplete` prop) to re-render the RSC with fresh status.

**Overall verification status banner** at the top — same banner component as dashboard.

---

### 5. Profile (`/dashboard/profile`)

**RSC for initial data load, client form component for editing.**

Fetch `getUserProfile(userId)`.

**New component: `components/customer/ProfileForm.tsx`** (`'use client'`)

Fields (react-hook-form + zod):

| Field | Type | Validation |
|---|---|---|
| Display name | text | Required, 2–80 chars |
| Phone | text | Required, E.164-compatible (10 digits, 11 digits starting with 1, or `+` prefix) — same rules as `normalizePhoneNumber` in notificationService |
| Date of birth | date | Required, must be 18+ years ago |
| Address line 1 | text | Optional |
| Address line 2 | text | Optional |
| City | text | Optional |
| State | text | Optional |
| Zip | text | Optional |
| SMS opt-in | checkbox | Optional, default false |

Phone validation is important — malformed numbers silently drop SMS notifications. Validate on save and show inline error.

**Save flow:**
1. `PATCH /api/me/profile` with the updated fields
2. Show success toast/banner on save
3. Show inline field errors on validation failure

---

## New API Routes

### `GET /api/me/bookings`

Auth-guarded (`requireAuth`). Returns all bookings for the authenticated user.

```ts
const bookings = await listBookingsForUser(user.userId);
return NextResponse.json({ bookings });
```

`FirebaseConfigError` → 503. Auth error → 401.

### `PATCH /api/me/profile`

Auth-guarded (`requireAuth`). Accepts partial profile fields.

**Request body type:**
```ts
type UpdateProfileBody = {
  displayName?: string;
  phone?: string;
  dateOfBirth?: string;
  address?: UserAddress;
  smsOptIn?: boolean;
};
```

**Server-side validation:**
- `displayName`: 2–80 chars if provided
- `phone`: matches `/^\+?[\d\s\-().]{7,20}$/` if provided (loose format — normalisation happens at send time)
- `dateOfBirth`: valid ISO date string if provided
- `smsOptIn`: boolean if provided

**Write:** calls `upsertUserProfile` with `{ id: user.userId, ...body }` merged with existing profile. Never allows overwriting `email`, `role`, `verificationStatus`, or `stripeCustomerId` via this endpoint.

```ts
const existing = await getUserProfile(user.userId);
if (!existing) {
  return NextResponse.json({ error: "Profile not found." }, { status: 404 });
}

const updated = await upsertUserProfile({
  ...existing,
  ...(body.displayName !== undefined ? { displayName: body.displayName } : {}),
  ...(body.phone !== undefined ? { phone: body.phone } : {}),
  ...(body.dateOfBirth !== undefined ? { dateOfBirth: body.dateOfBirth } : {}),
  ...(body.address !== undefined ? { address: body.address } : {}),
  ...(body.smsOptIn !== undefined ? { smsOptIn: body.smsOptIn } : {}),
});

return NextResponse.json({ profile: updated });
```

---

## Accessing `userId` in RSC Pages

The customer layout verifies the session token but does not currently pass `userId` to child pages. Two options:

**Option A (recommended):** Re-verify in each page that needs it. Cost is one Firebase Admin SDK call per page load, already paid in the layout — a small overhead.

```ts
// Inside the RSC page
const cookieStore = await cookies();
const token = cookieStore.get("__session")?.value ?? cookieStore.get("token")?.value;
const adminAuth = getAdminAuth();
const decoded = token && adminAuth ? await adminAuth.verifyIdToken(token).catch(() => null) : null;
if (!decoded) redirect("/login");
const userId = decoded.uid;
```

**Option B:** Set a custom request header in the layout (e.g., `x-user-id`) via `NextResponse.next({ headers })`. This avoids the double-verify but couples layout to page structure.

Use **Option A** for correctness and simplicity. Extract it into a shared helper:

```ts
// lib/auth/getServerUserId.ts
export async function getServerUserId(): Promise<string | null>
```

---

## Component Reuse

| Component | Location | Reused in portal |
|---|---|---|
| `BookingStatusBadge` | `components/admin/` | Booking list + detail |
| `DocumentUpload` | `components/documents/` | Documents page |
| `Badge` | `components/ui/` | Document status |
| `Modal` | `components/ui/` | `CustomerCancelPanel` |
| `Button` | `components/ui/` | Throughout |

---

## Acceptance Criteria for DCR-032

- [ ] `lib/auth/getServerUserId.ts` helper created
- [ ] `components/layout/CustomerSidebar.tsx` created (4 nav items, active state, fleet link)
- [ ] `app/(customer)/layout.tsx` updated to add sidebar grid layout
- [ ] `app/(customer)/dashboard/page.tsx` fully implemented (stub replaced)
- [ ] `app/(customer)/dashboard/bookings/page.tsx` created
- [ ] `app/(customer)/dashboard/bookings/[bookingId]/page.tsx` created
- [ ] `app/(customer)/dashboard/documents/page.tsx` created
- [ ] `app/(customer)/dashboard/profile/page.tsx` created
- [ ] `components/customer/ProfileForm.tsx` created with zod validation and phone format check
- [ ] `components/customer/CustomerCancelPanel.tsx` created
- [ ] `GET /api/me/bookings/route.ts` created
- [ ] `PATCH /api/me/profile/route.ts` created (does not allow overwriting `email`, `role`, `verificationStatus`, `stripeCustomerId`)
- [ ] `CustomerSidebar` added to `app/(customer)/layout.tsx`
- [ ] `npm run build` passes

---

## Out of Scope for DCR-032

- In-app notifications / notification bell
- Booking modification (date/extras changes post-booking)
- Loyalty points or repeat customer discounts (DCR-033)
- Payment method management
