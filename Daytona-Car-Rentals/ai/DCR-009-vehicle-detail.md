# DCR-009 — Vehicle Detail Page Spec

**Owner:** Claude
**Status:** Complete
**Depends on:** DCR-003

---

## Page Goal

Give the customer enough confidence to book. Show the vehicle clearly, communicate value, and make the "Book Now" entry point impossible to miss.

---

## Route

```
/fleet/[vehicleId]
```

This is a **React Server Component** — vehicle data is fetched server-side. Date params from the fleet page are read from URL search params.

---

## Page Layout

```
<Navbar />

┌──────────────────────────────────────────────────────────────────┐
│ ← Back to Fleet                                                  │
│                                                                  │
│  ┌─────────────────────────────────┐  ┌───────────────────────┐ │
│  │  IMAGE GALLERY                  │  │  BOOKING CARD         │ │
│  │  [Main image — 16:9]            │  │                       │ │
│  │  [thumb][thumb][thumb][thumb]   │  │  2023 Toyota Camry    │ │
│  └─────────────────────────────────┘  │  Economy              │ │
│                                       │                       │ │
│  2023 Toyota Camry                    │  $85 / day            │ │
│  [Economy badge]  [Available badge]   │                       │ │
│                                       │  Pick-up Date         │ │
│  ─────────────────────────────────    │  [date input]         │ │
│  OVERVIEW                             │  Return Date          │ │
│  5 seats  Auto  Unlimited miles       │  [date input]         │ │
│  2023  ·  Air Con  ·  Bluetooth       │  Location             │ │
│                                       │  [select]             │ │
│  ─────────────────────────────────    │                       │ │
│  DESCRIPTION                          │  ─────────────────    │ │
│  Lorem ipsum...                       │  5 days × $85         │ │
│                                       │  = $425               │ │
│  ─────────────────────────────────    │  Deposit: $200        │ │
│  FEATURES                             │                       │ │
│  ✓ Bluetooth   ✓ Backup Camera        │  [Book Now →]         │ │
│  ✓ USB Ports   ✓ GPS Ready            │  (primary, full-width)│ │
│  ✓ Cruise Ctrl ✓ Apple CarPlay        │                       │ │
│                                       │  ✓ Free cancellation  │ │
│  ─────────────────────────────────    │  ✓ No hidden fees     │ │
│  AVAILABILITY CALENDAR (optional)     └───────────────────────┘ │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

<Footer />
```

---

## Component Breakdown

### `VehicleImageGallery`

**File:** `components/fleet/VehicleImageGallery.tsx`

```ts
interface VehicleImageGalleryProps {
  images: string[]    // Firebase Storage paths → converted to public URLs
  make: string
  model: string
}
```

- Main image: `next/image` fill, `aspect-video object-cover rounded-xl`
- Thumbnails: horizontal scroll row below main image; click sets active index
- Active thumbnail: `ring-2 ring-brand-500`
- If only 1 image: hide thumbnail row
- Lightbox on click (optional — can be deferred): open full-screen modal

---

### `VehicleBookingCard`

**File:** `components/fleet/VehicleBookingCard.tsx` — `'use client'`

```ts
interface VehicleBookingCardProps {
  vehicle: Vehicle
  initialStartDate?: string
  initialEndDate?: string
}
```

**State:**
```ts
const [startDate, setStartDate] = useState(initialStartDate ?? '')
const [endDate, setEndDate] = useState(initialEndDate ?? '')
const [location, setLocation] = useState('')
const [error, setError] = useState<string | null>(null)
```

**Price calculation (client-side, display only):**
```ts
const days = startDate && endDate
  ? differenceInCalendarDays(parseISO(endDate), parseISO(startDate))
  : 0
const baseTotal = days * vehicle.dailyRate   // cents
```

**Booking CTA:**
- Validates: both dates selected, endDate > startDate, location chosen
- On valid: `router.push('/booking/[vehicleId]?start=X&end=Y&location=Z')`
- On invalid: shows inline error message below the button

**Trust signals below button:**
- `lucide-react` CheckCircle icons: "Free cancellation within 24h" · "No hidden fees" · "Secure payment via Stripe"

---

### Availability indicator

- Shows `<Badge variant="success">Available</Badge>` if `vehicle.available == true`
- Shows `<Badge variant="error">Currently Unavailable</Badge>` if false
- Does NOT show per-date availability here (that's checked in booking flow step 1)

---

### Features section

Display `vehicle.features` as a 2-column grid of checkmark + label rows.

```tsx
<div className="grid grid-cols-2 gap-2">
  {vehicle.features.map(f => (
    <div key={f} className="flex items-center gap-2 text-sm text-neutral-700">
      <Check className="w-4 h-4 text-brand-500 shrink-0" />
      {f}
    </div>
  ))}
</div>
```

---

## Data Flow

```
app/(public)/fleet/[vehicleId]/page.tsx  (RSC)
  └─ params.vehicleId → getDoc vehicles/{vehicleId} via vehicleService
  └─ searchParams.start / searchParams.end passed to VehicleBookingCard
  └─ renders: VehicleImageGallery (server), vehicle details (server)
  └─ renders: VehicleBookingCard (client — needs interactivity)
```

**If vehicle not found:** `notFound()` → Next.js 404 page.

---

## Breadcrumb / Back Link

```tsx
<Link href="/fleet" className="flex items-center gap-1 text-sm text-neutral-500 hover:text-brand-500 mb-6">
  <ChevronLeft className="w-4 h-4" />
  Back to Fleet
</Link>
```

---

## Responsive Behavior

| Breakpoint | Layout |
|---|---|
| Mobile | Gallery full width; booking card below gallery; thumbnails horizontal scroll |
| `lg+` | 2-column: gallery + details left (60%), booking card right (40%) sticky |

Booking card is `sticky top-24` on desktop so it stays visible while scrolling description.

---

## SEO / Meta

```tsx
export async function generateMetadata({ params }) {
  const vehicle = await getVehicle(params.vehicleId)
  return {
    title: `${vehicle.year} ${vehicle.make} ${vehicle.model} — Daytona Car Rentals`,
    description: `Rent a ${vehicle.year} ${vehicle.make} ${vehicle.model} in Daytona Beach from $${vehicle.dailyRate / 100}/day. Book online instantly.`,
  }
}
```

---

## Acceptance Criteria (Codex DCR-010)

- [ ] `notFound()` called when vehicleId does not exist in Firestore
- [ ] Gallery thumbnail click updates main image
- [ ] Booking card pre-fills dates from URL search params
- [ ] Price summary only renders when both valid dates are selected
- [ ] `days` count never goes negative or zero (validation blocks this)
- [ ] "Book Now" navigates to correct booking URL with all params
- [ ] Booking card is `sticky` on desktop (stays in view on scroll)
- [ ] Vehicle images are fetched from Storage and rendered via `next/image`
