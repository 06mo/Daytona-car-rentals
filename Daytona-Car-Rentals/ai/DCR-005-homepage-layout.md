# DCR-005 — Homepage Layout Spec

**Owner:** Claude
**Status:** Complete
**Depends on:** DCR-003

---

## Page Goal

Convert visitors into bookings. Establish trust (local brand, real fleet, easy process). Surface the search/browse entry point above the fold.

---

## Section Map

```
<Navbar />
<HeroSection />          ← above the fold
<TrustBar />             ← just below fold
<FeaturedFleet />
<HowItWorks />
<WhyDaytona />
<Testimonials />
<CTABanner />
<Footer />
```

---

## Section Specs

### `<Navbar />`

**File:** `components/layout/Navbar.tsx`

- Sticky, `bg-white/95 backdrop-blur-sm border-b border-neutral-200`
- Left: Logo (SVG wordmark or image)
- Center (desktop): `Fleet` · `About` · `Contact`
- Right:
  - Guest: `Log In` (ghost button) + `Sign Up` (primary button)
  - Authed customer: avatar dropdown → Dashboard · My Bookings · Sign Out
  - Authed admin: `Admin Panel` link
- Mobile: hamburger → full-screen slide-down menu
- Active link: `text-brand-500 font-semibold`

---

### `<HeroSection />`

**File:** `components/home/HeroSection.tsx`

Layout: **full-width image background** with dark overlay, centered text + search card on top.

```
┌──────────────────────────────────────────────────────┐
│  [background: wide road/car photo]                   │
│  overlay: bg-neutral-900/60                          │
│                                                      │
│     Premium Cars.  Simple Rentals.                   │
│     Explore Daytona in style.                        │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  Pick-up Location  │  Pick-up Date  │ Return   │  │
│  │  [input]           │  [date]        │ [date]   │  │
│  │                    │          [Search Fleet →] │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

- Heading: `text-4xl md:text-5xl lg:text-6xl font-bold text-white`
- Sub: `text-lg text-neutral-200 mt-4`
- Search card: `bg-white rounded-xl shadow-lg p-6 mt-8 max-w-3xl mx-auto`
  - Three fields in a row (desktop) / stacked (mobile)
  - Location: text input with suggestions (static list of Daytona locations)
  - Dates: two `<input type="date">` fields (use DateRangePicker component)
  - CTA: full-width `primary` Button — "Search Available Cars"
  - On submit: navigate to `/fleet?location=X&start=Y&end=Z`
- Background image loaded via `next/image` with `priority` and `fill`

---

### `<TrustBar />`

**File:** `components/home/TrustBar.tsx`

Thin strip, `bg-neutral-50 border-y border-neutral-200`.

4 icon + stat pills in a row:

```
🚗  50+ Vehicles      ✓  Fully Insured      ★  4.9/5 Rating      📍  Daytona-Based
```

- Icons from `lucide-react`
- Stat number: `text-brand-500 font-bold`
- Label: `text-neutral-600 text-sm`

---

### `<FeaturedFleet />`

**File:** `components/home/FeaturedFleet.tsx`

Section heading: "Our Most Popular Rides"
Sub: "Hand-picked for comfort, style, and value."

- Show 3 `<VehicleCard />` components (Firestore query: `available == true`, ordered by `createdAt desc`, limit 3)
- This is a **React Server Component** — fetch at render time
- Below cards: `<Button variant="outline">Browse Full Fleet →</Button>` → `/fleet`
- Layout: `grid grid-cols-1 md:grid-cols-3 gap-6`

---

### `<HowItWorks />`

**File:** `components/home/HowItWorks.tsx`

Alternating icon + text, horizontal on desktop.

```
1. Choose Your Car     2. Book & Pay Online     3. Pick Up & Drive
   [car icon]             [credit card icon]        [key icon]
   Browse our fleet,      Select your dates,         Show your ID and
   filter by type         pay securely via           hit the road.
   and budget.            Stripe.
```

- Steps: numbered circles `w-10 h-10 rounded-full bg-brand-500 text-white`
- Connector lines between steps (desktop only): `border-t border-dashed border-neutral-300`
- This section is purely static — no data fetch

---

### `<WhyDaytona />`

**File:** `components/home/WhyDaytona.tsx`

2-column layout (desktop): left = text + list, right = image.

**Left:**
- Heading: "Why Rent With Us?"
- 4 bullet points with check icons:
  - No hidden fees
  - Local Daytona knowledge
  - 24/7 roadside assistance
  - Flexible cancellation

**Right:**
- `next/image` of a car being handed over / local Daytona scene
- `rounded-xl overflow-hidden`

---

### `<Testimonials />`

**File:** `components/home/Testimonials.tsx`

3 review cards in a row. Static data (hardcoded, not from Firestore).

```ts
const testimonials = [
  { name: 'Sarah M.', rating: 5, text: '...', vehicle: 'Toyota Camry' },
  { name: 'James T.', rating: 5, text: '...', vehicle: 'Ford Explorer' },
  { name: 'Lisa K.', rating: 5, text: '...', vehicle: 'Chevy Suburban' },
]
```

- Star rating: filled `lucide-react` `Star` icons, `text-yellow-400`
- Card: `<Card>` component with subtle shadow

---

### `<CTABanner />`

**File:** `components/home/CTABanner.tsx`

Full-width band, `bg-brand-500`.

```
Ready to Hit the Road?
[Book Your Car Today →]   (white outline button → /fleet)
```

- Heading: `text-white text-3xl font-bold`
- Button: `variant="outline"` styled to white border/text on brand background

---

### `<Footer />`

**File:** `components/layout/Footer.tsx`

4-column grid (desktop) / 2-column (mobile):

| Column | Content |
|---|---|
| Brand | Logo, tagline, social icons |
| Explore | Fleet, About, Contact |
| Support | FAQ, Terms, Privacy Policy |
| Contact | Phone, Email, Address |

- `bg-neutral-900 text-neutral-400`
- Bottom bar: `© 2026 Daytona Car Rentals. All rights reserved.`

---

## Data Requirements

| Section | Source | Fetch type |
|---|---|---|
| FeaturedFleet | Firestore `vehicles` | RSC fetch (server) |
| All others | Static / hardcoded | No fetch |

---

## Responsive Breakpoints

| Breakpoint | Layout changes |
|---|---|
| `< md` (< 768px) | Hero search fields stack; TrustBar wraps 2×2; Fleet grid 1-col; HowItWorks stacks vertically; WhyDaytona stacks; Testimonials 1-col |
| `md` (768px+) | Fleet grid 3-col; Testimonials 3-col; WhyDaytona 2-col |
| `lg` (1024px+) | Hero text larger; full nav visible |

---

## SEO / Meta

```tsx
// app/(public)/page.tsx
export const metadata = {
  title: 'Daytona Car Rentals — Affordable Car Hire in Daytona Beach',
  description: 'Rent a car in Daytona Beach with no hidden fees. Economy, SUV, luxury, and van rentals available. Book online in minutes.',
}
```
