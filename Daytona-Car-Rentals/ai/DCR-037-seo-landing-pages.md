# DCR-037 — SEO Landing Pages

**Owner:** Claude
**Status:** Complete
**Blocks:** DCR-038

---

## Objective

Create a set of targeted landing pages that rank for high-intent Daytona Beach car
rental searches — airport pickups, vehicle categories, and seasonal events. Each page
has unique copy, structured metadata, and JSON-LD schema. Implement a sitemap and
robots.txt so all public pages are crawlable.

---

## Route Architecture

All landing pages live under `app/(public)/rentals/` as individual static RSC files.
They share common layout components but each has unique copy, metadata, and vehicle
filtering.

```
app/(public)/rentals/
├── daytona-beach-airport/page.tsx    ← /rentals/daytona-beach-airport
├── suv/page.tsx                      ← /rentals/suv
├── luxury/page.tsx                   ← /rentals/luxury
├── van/page.tsx                      ← /rentals/van
├── daytona-500/page.tsx              ← /rentals/daytona-500
├── bike-week/page.tsx                ← /rentals/bike-week
└── spring-break/page.tsx             ← /rentals/spring-break
```

These are pure RSC pages — no `'use client'` at the page level. Vehicle data is
fetched server-side and passed to existing UI components.

---

## New Components: `components/landing/`

Build these components once. Every landing page uses the same set.

### `LandingHero.tsx`

Props:
```typescript
type LandingHeroProps = {
  headline: string;
  subheadline: string;
  ctaLabel?: string;         // default: "Browse Available Cars"
  ctaHref?: string;          // default: "/fleet"
  badge?: string;            // optional orange pill above headline e.g. "Daytona Beach, FL"
};
```

Layout: centered, max-w-3xl, orange badge → H1 → subheadline paragraph → CTA button.
Use the existing `Button` component for the CTA. No background image — clean white
section consistent with site tone.

### `LandingFeatures.tsx`

Props:
```typescript
type LandingFeature = { icon: LucideIcon; title: string; body: string };
type LandingFeaturesProps = { features: LandingFeature[] };
```

3-column grid (1-col on mobile). Each card: icon in orange, bold title, 1-sentence body.
Reuse existing card styling (`rounded-[2rem] border border-slate-200 bg-white`).

### `LandingFAQ.tsx`

Props:
```typescript
type FAQItem = { question: string; answer: string };
type LandingFAQProps = { items: FAQItem[] };
```

Simple expanded list — no accordion/JS needed. Each item: `<h3>` question, `<p>` answer.
Max 5 items per page. Section heading: "Frequently Asked Questions".

### `LandingCTA.tsx`

Props:
```typescript
type LandingCTAProps = {
  heading: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
};
```

Full-width orange-tinted section (same `CTABanner` styling as homepage). Used as the
page footer above the site Footer.

### `JsonLd.tsx`

Props:
```typescript
type JsonLdProps = { schema: Record<string, unknown> };
```

Renders `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />`.
Used in RSC pages — not a client component.

---

## Shared JSON-LD: LocalBusiness Schema

Define once in `lib/data/localBusinessSchema.ts` and import into every landing page:

```typescript
export const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "AutoRental",
  "name": "Daytona Car Rentals",
  "url": "https://daytonacarrentals.com",
  "telephone": "(386) 555-0132",
  "email": "hello@daytonacarrentals.com",
  "priceRange": "$$",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "801 International Speedway Blvd",
    "addressLocality": "Daytona Beach",
    "addressRegion": "FL",
    "postalCode": "32114",
    "addressCountry": "US"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 29.1853,
    "longitude": -81.0566
  }
};
```

---

## Page Inventory

### 1. `/rentals/daytona-beach-airport`

**Target keyword:** "Daytona Beach airport car rental"

```
title:       "Daytona Beach Airport Car Rental | Daytona Car Rentals"
description: "Pick up your rental car at Daytona Beach Airport (DAB). No hidden fees,
              unlimited mileage options, and online booking in minutes."
H1:          "Car Rental at Daytona Beach Airport"
badge:       "Daytona Beach International Airport · DAB"
```

**Subheadline:** Reserve your vehicle before you land. We offer quick pick-up near
Daytona Beach International Airport with a full fleet of economy, SUV, and luxury cars
ready for your trip.

**Vehicle filter:** all available vehicles (no category filter — show full fleet)

**Features (3):**
1. Airport-Area Pick-Up — Convenient collection near DAB with clear directions included in your booking confirmation.
2. No Hidden Fees — The price you see at checkout is the price you pay. No surprise airport surcharges.
3. Flexible Returns — Return your vehicle at the same location or our downtown drop-off point.

**FAQ (4):**
1. Q: Where exactly is pick-up? A: Pick-up is at our location near Daytona Beach International Airport (DAB). Full address and directions are sent with your booking confirmation.
2. Q: Can I book a car and pick it up same day? A: Yes — book online and we'll have your vehicle ready. We recommend at least 2 hours notice for same-day bookings.
3. Q: Do you offer a shuttle from the terminal? A: Contact us when you land and we'll arrange collection. Our team is minutes from the terminal.
4. Q: What documents do I need? A: A valid driver's license and insurance card. You can upload these in advance during booking or bring them to pick-up.

**CTA heading:** Ready to Roll? Your Daytona Beach Adventure Starts Here.

**JSON-LD:** `localBusinessSchema` + FAQPage schema from FAQ items.

---

### 2. `/rentals/suv`

**Target keyword:** "SUV rental Daytona Beach"

```
title:       "SUV Rentals in Daytona Beach | Spacious & Comfortable"
description: "Rent an SUV in Daytona Beach for families, groups, and road trips.
              Spacious interiors, ample luggage space, and online booking."
H1:          "SUV Rentals in Daytona Beach"
badge:       "Families · Groups · Road Trips"
```

**Subheadline:** Need space for the whole crew? Our SUV fleet handles Daytona's beaches,
outlet malls, and day trips to Orlando with room to spare.

**Vehicle filter:** `category: "suv"`

**Features (3):**
1. Family-Ready Space — Seating for 5–8 with cargo room for luggage, beach gear, and strollers.
2. All-Terrain Capable — Comfortable on highway and beach-access roads alike.
3. Competitive Daily Rates — Transparent SUV pricing with no mileage surprises on most models.

**FAQ (4):**
1. Q: How many passengers fit in your SUVs? A: Our SUVs seat between 5 and 8 passengers depending on the model. Seating capacity is shown on each vehicle listing.
2. Q: Do you have SUVs with unlimited mileage? A: Most of our SUVs include unlimited mileage. Check the individual vehicle listing for mileage policy details.
3. Q: Can I drive to Orlando in a rental SUV? A: Yes — interstate driving within Florida is fully permitted under our rental agreement.
4. Q: Is there a deposit required? A: A refundable deposit is charged at the time of booking. The amount varies by vehicle and is shown clearly before checkout.

**CTA heading:** Plenty of Room, Zero Compromise.

**JSON-LD:** `localBusinessSchema` + FAQPage schema.

---

### 3. `/rentals/luxury`

**Target keyword:** "luxury car rental Daytona Beach"

```
title:       "Luxury Car Rentals in Daytona Beach | Premium Fleet"
description: "Rent a luxury car in Daytona Beach. BMWs, Mercedes, and premium vehicles
              available for special occasions, business travel, and weekend getaways."
H1:          "Luxury Car Rentals in Daytona Beach"
badge:       "Premium · Special Occasions · Business Travel"
```

**Subheadline:** Arrive in style. Our luxury fleet is available for anniversaries, corporate
trips, race week VIP experiences, and anyone who simply wants to enjoy the drive.

**Vehicle filter:** `category: "luxury"`

**Features (3):**
1. Premium Vehicles — Carefully maintained luxury cars kept to the highest standard.
2. Discreet & Professional — Clean, polished vehicles delivered on time. No fuss.
3. Flexible Duration — Available for single days, weekends, or extended stays throughout Daytona Beach.

**FAQ (4):**
1. Q: What luxury cars are available? A: Browse our current luxury inventory on the fleet page — availability changes. Book early, especially during race weeks.
2. Q: Are luxury rentals available for one day? A: Yes, minimum rental is one day for all vehicle categories.
3. Q: Is extra insurance required for luxury vehicles? A: Standard rental insurance covers luxury vehicles. We also offer Collision Damage Waiver (CDW) add-on for full peace of mind.
4. Q: Do you offer airport delivery for luxury vehicles? A: Contact us after booking and we'll discuss collection options near Daytona Beach Airport.

**CTA heading:** Life's Too Short for an Ordinary Car.

**JSON-LD:** `localBusinessSchema` + FAQPage schema.

---

### 4. `/rentals/van`

**Target keyword:** "van rental Daytona Beach" / "minivan rental Daytona Beach"

```
title:       "Van Rentals in Daytona Beach | Groups & Families"
description: "Rent a van or people-carrier in Daytona Beach. Ideal for large groups,
              family reunions, sporting events, and airport transfers."
H1:          "Van & People-Carrier Rentals in Daytona Beach"
badge:       "Large Groups · 7–12 Passengers"
```

**Subheadline:** Moving a big group around Daytona Beach? Our vans keep everyone together
without the convoy — perfect for family reunions, sporting events, and corporate outings.

**Vehicle filter:** `category: "van"`

**Features (3):**
1. Maximum Capacity — Seats up to 12 passengers with luggage space for extended trips.
2. Event-Ready — Popular for Daytona 500, Bike Week, and Spring Break group travel.
3. One Vehicle, Whole Group — Simpler logistics, shared costs, and less parking stress.

**FAQ (4):**
1. Q: How many people fit in your vans? A: Our vans seat 7 to 12 passengers. Exact seating capacity is listed on each vehicle.
2. Q: Can a van be used for airport group transfers? A: Absolutely — our vans are a cost-effective solution for group airport pick-ups and drop-offs.
3. Q: Is a special license required to drive a van? A: No special license is required. A standard US driver's license covers all vehicles in our fleet.
4. Q: Do you offer multi-day van rentals? A: Yes, and long-term rentals of 7+ days qualify for our weekly discount automatically.

**CTA heading:** The Whole Group Travels Together.

**JSON-LD:** `localBusinessSchema` + FAQPage schema.

---

### 5. `/rentals/daytona-500`

**Target keyword:** "Daytona 500 car rental" / "car rental Daytona Speed Weeks"

```
title:       "Car Rental for Daytona 500 & Speed Weeks | Book Early"
description: "Rent a car for the Daytona 500 and Speed Weeks. Fleet availability is
              limited during race week — secure your vehicle before it sells out."
H1:          "Car Rental for Daytona 500 & Speed Weeks"
badge:       "February · Daytona International Speedway"
```

**Subheadline:** Speed Weeks brings hundreds of thousands of visitors to Daytona Beach every
February. Our fleet fills up fast — book your rental car as early as possible to guarantee
availability during race week.

**Vehicle filter:** all available vehicles

**Features (3):**
1. Limited Race-Week Availability — Our fleet is in high demand during the Daytona 500. We recommend booking 4–6 weeks in advance.
2. Explore Beyond the Track — Hotels, restaurants, and beaches are spread across the area. A rental car is the best way to move freely during Speed Weeks.
3. Flexible Pickup & Drop-Off — Multiple convenient locations so you can get from your hotel to the speedway on your schedule.

**Prominent notice** (styled callout box, amber/orange border):
> **Race Week Notice:** Vehicle demand peaks sharply during Daytona 500 week. Peak-season
> pricing applies (shown at checkout). Book early to lock in availability.

**FAQ (5):**
1. Q: How far in advance should I book for the Daytona 500? A: We recommend booking 4–6 weeks before race week. February is our busiest month and vehicles are often fully reserved by late January.
2. Q: Is there surge pricing during the Daytona 500? A: Yes — race week falls within our Speed Weeks peak pricing period. The exact rate is shown transparently at checkout before you confirm.
3. Q: Where can I park at the Daytona International Speedway? A: Parking passes are sold separately by the Speedway. Our vehicles comply with all standard size requirements for Speedway lots.
4. Q: What if my race is cancelled or postponed? A: Bookings can be cancelled up to 24 hours before the rental start. See our cancellation policy for details.
5. Q: Do you offer one-way rentals from the airport? A: Contact us for one-way arrangements. Most bookings return to the same location.

**CTA heading:** Engines Are Already Running. Book Your Car Before It's Gone.

**JSON-LD:** `localBusinessSchema` + Event schema for the Daytona 500 + FAQPage schema.

---

### 6. `/rentals/bike-week`

**Target keyword:** "Bike Week Daytona car rental" / "Daytona Bike Week rental car"

```
title:       "Car Rental During Bike Week Daytona Beach | Explore FL"
description: "Need a car during Daytona Bike Week? Explore the area while the crowds
              gather on the strip. Easy online booking, full fleet available."
H1:          "Car Rental During Bike Week Daytona Beach"
badge:       "March · Daytona Beach, FL"
```

**Subheadline:** Not everyone at Bike Week is on two wheels. Rent a car to explore New Smyrna
Beach, St. Augustine, or the Kennedy Space Center while the action unfolds on Main Street.

**Vehicle filter:** all available vehicles

**Features (3):**
1. Beat the Traffic — A car lets you explore beyond the Bike Week strip on your own schedule.
2. Day Trips Made Easy — St. Augustine (1 hr), Kennedy Space Center (1 hr), Orlando theme parks (1 hr) are all within reach.
3. Book Alongside Your Hotel — Secure your rental the same time you book accommodation — both fill up fast in March.

**FAQ (3):**
1. Q: Is it hard to get around Daytona Beach during Bike Week? A: Parts of the main strip can be congested, but a car gives you full flexibility to explore the wider area on your own schedule.
2. Q: What's the best vehicle type for Bike Week? A: Most of our customers choose an economy or SUV. Economy cars are nimble in traffic; SUVs are better if you're travelling in a group.
3. Q: When does Bike Week usually run? A: Daytona Bike Week typically runs for 10 days in early-to-mid March. Check the official schedule and book your vehicle to cover your stay.

**CTA heading:** Four Wheels, Your Rules — Even During Bike Week.

**JSON-LD:** `localBusinessSchema` + FAQPage schema.

---

### 7. `/rentals/spring-break`

**Target keyword:** "Spring Break car rental Daytona Beach"

```
title:       "Spring Break Car Rental Daytona Beach | Groups Welcome"
description: "Rent a car or van for Spring Break in Daytona Beach. Great rates for
              groups. Book early — March and April availability fills fast."
H1:          "Spring Break Car Rental in Daytona Beach"
badge:       "March – April · Groups Welcome"
```

**Subheadline:** Daytona Beach is Florida's Spring Break capital. Whether you're rolling in
a group or flying solo, a rental car means you call the shots — beach days, road trips,
theme parks, and everything in between.

**Vehicle filter:** `category: "suv"` + `category: "van"` (show group-friendly vehicles)
— query both categories and merge into a single list sorted by seats desc.

**Features (3):**
1. Group-Friendly Fleet — From 5-seat SUVs to 12-seat vans — the whole group in one vehicle.
2. Freedom to Explore — Daytona's best spots are spread out. A rental car opens up the whole coastline.
3. Transparent Group Pricing — Split one daily rate between the group. Often cheaper than rideshare for multiple trips.

**Prominent notice** (styled callout box):
> **Book Early for Spring Break:** March and April are peak season in Daytona Beach.
> Vehicle availability is limited — reserve your car as soon as your travel dates are confirmed.

**FAQ (4):**
1. Q: How old do you need to be to rent a car? A: Renters must be 21 or older with a valid driver's license. Additional young driver fees may apply for renters under 25.
2. Q: Can multiple people drive the rental? A: Yes — add an Additional Driver during checkout. Each authorised driver must be listed and present their license at pick-up.
3. Q: What's the best vehicle for a group of 6? A: An SUV comfortably seats 5–7. For 6+ we recommend checking our van availability for extra comfort and luggage space.
4. Q: Is there a minimum rental period during Spring Break? A: No minimum — you can rent for a single day or the full week. Long-term discounts apply automatically for 7+ day rentals.

**CTA heading:** Spring Break Hits Different With Your Own Wheels.

**JSON-LD:** `localBusinessSchema` + FAQPage schema.

---

## Technical SEO

### Metadata pattern (all landing pages)

Each page exports a `metadata` object:

```typescript
export const metadata: Metadata = {
  title: "...",
  description: "...",
  alternates: {
    canonical: "https://daytonacarrentals.com/rentals/[slug]",
  },
  openGraph: {
    title: "...",
    description: "...",
    url: "https://daytonacarrentals.com/rentals/[slug]",
    siteName: "Daytona Car Rentals",
    locale: "en_US",
    type: "website",
  },
};
```

Define `const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://daytonacarrentals.com"` and use it throughout.

### `app/sitemap.ts`

```typescript
export default async function sitemap(): Promise<MetadataRoute.Sitemap>
```

Includes:
- Static pages: `/`, `/fleet`, `/about`, `/contact`, all 7 `/rentals/*` pages
- Dynamic vehicle pages: fetched via `listVehicles({})` — one entry per vehicle using `vehicle.updatedAt`
- Priorities: homepage 1.0, `/fleet` 0.9, landing pages 0.85, vehicle pages 0.7

`FirebaseConfigError` in the vehicle fetch → return static pages only (never throw from sitemap).

### `app/robots.ts`

```typescript
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/dashboard/", "/booking/", "/api/"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
```

### JSON-LD FAQPage schema helper

Define `buildFaqSchema(items: FAQItem[])` in `lib/data/localBusinessSchema.ts`:

```typescript
export function buildFaqSchema(items: FAQItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": items.map((item) => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": { "@type": "Answer", "text": item.answer },
    })),
  };
}
```

---

## Footer Update

Add a "Rentals" column to `components/layout/Footer.tsx`. The footer currently has
4 columns; add a 5th (or replace the empty 4th column if grid allows):

```typescript
const rentalLinks = [
  { href: "/rentals/daytona-beach-airport", label: "Airport Rentals" },
  { href: "/rentals/suv", label: "SUV Rentals" },
  { href: "/rentals/luxury", label: "Luxury Cars" },
  { href: "/rentals/van", label: "Van Rentals" },
  { href: "/rentals/daytona-500", label: "Daytona 500" },
  { href: "/rentals/bike-week", label: "Bike Week" },
  { href: "/rentals/spring-break", label: "Spring Break" },
];
```

Column heading: "Rentals". This creates 8 internal links pointing to the new pages,
which signals their importance to crawlers.

Update grid to `lg:grid-cols-5` (or `sm:grid-cols-2 lg:grid-cols-5`).

---

## Deliverables for DCR-038

- [ ] `components/landing/LandingHero.tsx`
- [ ] `components/landing/LandingFeatures.tsx`
- [ ] `components/landing/LandingFAQ.tsx`
- [ ] `components/landing/LandingCTA.tsx`
- [ ] `components/landing/JsonLd.tsx`
- [ ] `lib/data/localBusinessSchema.ts` — `localBusinessSchema`, `buildFaqSchema`
- [ ] `app/(public)/rentals/daytona-beach-airport/page.tsx`
- [ ] `app/(public)/rentals/suv/page.tsx`
- [ ] `app/(public)/rentals/luxury/page.tsx`
- [ ] `app/(public)/rentals/van/page.tsx`
- [ ] `app/(public)/rentals/daytona-500/page.tsx`
- [ ] `app/(public)/rentals/bike-week/page.tsx`
- [ ] `app/(public)/rentals/spring-break/page.tsx`
- [ ] `app/sitemap.ts`
- [ ] `app/robots.ts`
- [ ] `components/layout/Footer.tsx` — Rentals column added
- [ ] `npm run build` passes — all 7 pages pre-rendered with no errors

---

## What is NOT in scope

- Dynamic OG image generation (`@vercel/og`)
- Programmatic location pages (Port Orange, Ormond Beach, etc.) — future task
- Blog / content marketing
- Schema for individual vehicle listings (future enhancement to vehicle detail pages)
- Multi-language / hreflang
