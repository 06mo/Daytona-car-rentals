# DCR-007 — Fleet Page UX Spec

**Owner:** Claude
**Status:** Complete
**Depends on:** DCR-003

---

## Page Goal

Let customers find the right vehicle fast. Filters narrow the list; cards show enough to decide; click goes to detail page.

---

## URL Design

```
/fleet
/fleet?category=suv
/fleet?category=suv&minPrice=50&maxPrice=150&start=2026-04-01&end=2026-04-05&location=daytona-beach
```

All filter state lives in URL search params — shareable links, browser back works correctly.

---

## Page Layout

```
<Navbar />

┌─────────────────────────────────────────────────────────────────┐
│  FILTERS (sidebar desktop / drawer mobile)                      │
│                                    VEHICLE GRID                 │
│  Category                          ┌────┐ ┌────┐ ┌────┐        │
│  [ ] Economy                       │    │ │    │ │    │        │
│  [ ] SUV                           └────┘ └────┘ └────┘        │
│  [ ] Luxury                        ┌────┐ ┌────┐ ┌────┐        │
│  [ ] Van                           │    │ │    │ │    │        │
│  [ ] Truck                         └────┘ └────┘ └────┘        │
│                                                                  │
│  Price / Day                       12 vehicles found            │
│  $25 ──●────── $300                                             │
│                                                                  │
│  Seats                                                           │
│  [2+] [4+] [5+] [7+]                                           │
│                                                                  │
│  Transmission                                                    │
│  [Auto] [Manual]                                                │
│                                                                  │
│  [Clear Filters]                                                │
└─────────────────────────────────────────────────────────────────┘

<Footer />
```

---

## Component Breakdown

### `VehicleFilters`

**File:** `components/fleet/VehicleFilters.tsx`

Props:
```ts
interface VehicleFiltersProps {
  onFiltersChange: (filters: FleetFilters) => void
  initialFilters: FleetFilters
}

interface FleetFilters {
  categories: VehicleCategory[]
  minPrice: number                // USD per day
  maxPrice: number
  minSeats: number
  transmission: 'automatic' | 'manual' | null
  startDate: string | null        // ISO date
  endDate: string | null
  location: string | null
}
```

**Sections:**
1. **Dates** (if not pre-filled from homepage hero) — two date inputs
2. **Location** — select dropdown (static list)
3. **Category** — checkbox group (Economy, SUV, Luxury, Van, Truck, Convertible)
4. **Price / Day** — dual-handle range slider (`$25` – `$500`); display `$X – $Y / day`
5. **Seats** — segmented button group: `2+`, `4+`, `5+`, `7+`
6. **Transmission** — toggle: `All` / `Automatic` / `Manual`
7. **Clear Filters** button — resets to defaults

**Behavior:**
- Each change calls `onFiltersChange` immediately (no submit button)
- Filters sync to URL via `router.replace` (shallow) — `useSearchParams` reads initial state
- Mobile: hidden behind a "Filters" button that opens a bottom drawer (`<Modal>`)
- Filter count badge on the mobile "Filters" button shows number of active filters

---

### `VehicleGrid`

**File:** `components/fleet/VehicleGrid.tsx`

```ts
interface VehicleGridProps {
  vehicles: Vehicle[]
  loading: boolean
}
```

- Layout: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6`
- Loading: show 6 `<VehicleCardSkeleton />` placeholders (Tailwind `animate-pulse`)
- Empty state: illustration + "No vehicles match your filters." + Clear Filters link
- Result count: `"12 vehicles available"` above the grid, `text-neutral-500 text-sm`
- Sort control: `<Select>` top-right — options: Price: Low to High · Price: High to Low · Newest

---

### `VehicleCard`

**File:** `components/fleet/VehicleCard.tsx`

```ts
interface VehicleCardProps {
  vehicle: Vehicle
  startDate?: string
  endDate?: string
}
```

Card layout:
```
┌────────────────────────────┐
│  [Hero image — 16:9]       │
│  [Category badge]          │
├────────────────────────────┤
│  2023 Toyota Camry         │
│  ★ Economy  · 5 seats      │
│  Auto  ·  Unlimited miles  │
│                            │
│  from $85/day              │
│  [Book Now →]              │
└────────────────────────────┘
```

- Image: `next/image` with `aspect-video object-cover rounded-t-xl`
- Category badge: `<Badge variant="info">` top-left over image
- Vehicle name: `text-lg font-semibold text-neutral-900`
- Feature row: `lucide-react` icons — Users (seats), Settings2 (transmission), Route (mileage)
- Price: `text-brand-500 font-bold text-xl` + `/day` in `text-neutral-500 text-sm`
- If dates are provided: show total price for the range
- "Book Now" → `/fleet/[vehicleId]` (or directly to `/booking/[vehicleId]?start=X&end=Y` if dates set)
- Whole card is a Next.js `<Link>` wrapper — `hover` state uses `Card` hover prop

---

### `VehicleCardSkeleton`

**File:** `components/fleet/VehicleCard.tsx` (exported alongside VehicleCard)

Mimics card layout with `bg-neutral-200 rounded animate-pulse` blocks.

---

## Filter Logic

All filtering happens **client-side** after an initial Firestore fetch of all `available == true` vehicles. This avoids building complex Firestore compound queries for every filter combination.

**Exception:** Availability by date range is checked server-side via `/api/vehicles/availability` when both `startDate` and `endDate` are present — returns an array of `vehicleId`s that are booked for that range, which are then excluded client-side.

```ts
// lib/hooks/useVehicles.ts
export function useVehicles(filters: FleetFilters) {
  // 1. Fetch all available vehicles once (Firestore, cached)
  // 2. Fetch booked vehicleIds for date range (API, when dates provided)
  // 3. Apply category / price / seats / transmission filters in memory
  // 4. Apply sort
  // Return: { vehicles, loading, error }
}
```

**Sort implementation:**

```ts
const sorted = [...filtered].sort((a, b) => {
  switch (sortBy) {
    case 'price_asc':  return a.dailyRate - b.dailyRate
    case 'price_desc': return b.dailyRate - a.dailyRate
    case 'newest':     return b.createdAt.seconds - a.createdAt.seconds
    default:           return 0
  }
})
```

---

## Responsive Behavior

| Breakpoint | Layout |
|---|---|
| Mobile (`< md`) | Filters hidden; "Filters (N)" floating button bottom-right opens drawer; grid 1-col |
| Tablet (`md`) | Filters hidden; button at top opens drawer; grid 2-col |
| Desktop (`lg+`) | Filters as sticky left sidebar (256px); grid 3-col |

---

## SEO / Meta

```tsx
export const metadata = {
  title: 'Rental Fleet — Daytona Car Rentals',
  description: 'Browse economy, SUV, luxury, and van rentals in Daytona Beach. Filter by price, seats, and dates. Instant online booking.',
}
```

---

## Acceptance Criteria (Codex DCR-008)

- [ ] URL params initialize filters on page load (`useSearchParams`)
- [ ] Filter changes update URL without full page reload (`router.replace` shallow)
- [ ] Skeleton shown while vehicles load
- [ ] Empty state shown when filter returns 0 results
- [ ] Date availability check fires only when both dates are set
- [ ] Sort control works for all 3 options
- [ ] Mobile filter drawer opens/closes correctly, shows active filter count
- [ ] VehicleCard links to correct `/fleet/[vehicleId]` route
- [ ] If dates pre-filled, VehicleCard "Book Now" includes date params in the link
