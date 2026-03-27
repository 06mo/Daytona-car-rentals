# DCR-034 — Dynamic Pricing Rules

**Owner:** Claude
**Status:** Complete
**Depends on:** DCR-015, DCR-017
**Blocks:** DCR-035

---

## Objective

Replace the flat `dailyRate × totalDays` formula with a rule engine that supports
weekend surcharges, Daytona-specific event premiums, seasonal rates, and long-term
rental discounts. All pricing remains server-authoritative — no client-trusted amounts.

---

## Guiding Constraints

1. **Backward-compatible types.** `BookingPricing` gains optional new fields; no existing fields change meaning or are removed. No migration needed.
2. **`computeBookingPricing` signature stays addable.** The new `rules` parameter is optional with a default of `[]`, so all existing callers continue to compile and behave identically at zero rules.
3. **Server-only rule resolution.** Rules are fetched from Firestore in `pricingService.ts` (server-only). The browser never receives raw rule data.
4. **Rules stack, not override.** Multiple surcharges for the same day multiply together. The most-favorable long-term discount wins (never stacks with other discount tiers).
5. **Per-day calculation.** Each day in the rental window is priced individually so weekend surcharges apply correctly to partial-week rentals.

---

## New Firestore Collection: `pricing_rules`

### Document shape

```typescript
type PricingRuleType = "weekend" | "date_range" | "long_term_discount";

// weekend — surcharge on specific days of the week (permanent, no dates)
type WeekendPricingRule = {
  id: string;
  type: "weekend";
  name: string;
  multiplier: number;   // e.g. 1.20 = 20% surcharge
  weekdays: number[];   // JS Date.getDay() values: 0=Sun 1=Mon … 6=Sat
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// date_range — surcharge for a calendar window (fixed or annually recurring)
type DateRangePricingRule = {
  id: string;
  type: "date_range";
  name: string;
  multiplier: number;   // e.g. 1.50 = 50% surcharge
  startDate: string;    // ISO "YYYY-MM-DD" — year ignored when recurring: true
  endDate: string;      // ISO "YYYY-MM-DD" — year ignored when recurring: true
  recurring: boolean;   // true = match by month/day every year
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// long_term_discount — discount for rentals of minDays or more
type LongTermDiscountRule = {
  id: string;
  type: "long_term_discount";
  name: string;
  minDays: number;      // minimum rental length to qualify
  multiplier: number;   // e.g. 0.90 = 10% discount
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type PricingRule = WeekendPricingRule | DateRangePricingRule | LongTermDiscountRule;
```

### Firestore security rules addition

```
match /pricing_rules/{ruleId} {
  allow read: if false;      // server-only via Admin SDK
  allow write: if isAdmin();
}
```

No client-side reads. No index needed (collection is tiny, always fully fetched).

---

## Updated `BookingPricing` Type

Add three optional fields to the existing type. All existing fields retain their current
definition unchanged.

```typescript
// types/booking.ts — add to BookingPricing

type BookingPricing = {
  // --- existing fields (unchanged) ---
  dailyRate: number;        // vehicle base daily rate, cents
  totalDays: number;
  baseAmount: number;       // dailyRate × totalDays (before any rule adjustments), cents
  extrasAmount: number;     // add-ons total, cents
  depositAmount: number;    // deposit charged online, cents
  totalAmount: number;      // what the customer pays in full: see formula below

  // --- new optional fields ---
  surchargeAmount?: number;       // sum of all positive per-day adjustments, cents (≥ 0)
  discountAmount?: number;        // absolute value of long-term discount, cents (≥ 0)
  appliedRuleNames?: string[];    // human-readable rule names for display
};

// Total formula:
// totalAmount = baseAmount + surchargeAmount + extrasAmount - discountAmount
//
// When no rules: surchargeAmount = 0, discountAmount = 0, appliedRuleNames = []
// This preserves the current totalAmount = baseAmount + extrasAmount behavior exactly.
```

---

## Updated `computeBookingPricing` Function

File: `lib/utils/pricing.ts`

```typescript
export function computeBookingPricing(
  vehicle: Vehicle,
  extrasPricing: ExtrasPricing,
  extras: BookingExtras,
  startDate: Date,
  endDate: Date,
  rules: PricingRule[] = [],   // new optional parameter — empty preserves existing behavior
): BookingPricing
```

### Algorithm

```
1. Build day list
   - days = every calendar day from startDate up to (but not including) endDate
   - totalDays = days.length  (same as getDateRangeInDays result)

2. Per-day pricing
   For each day in days:
     a. Gather applicable surcharge rules:
        - active WeekendPricingRule where day.getDay() ∈ rule.weekdays
        - active DateRangePricingRule where day falls within rule's window
          (for recurring: compare month/day only; for fixed: compare full date)
     b. dayRate = vehicle.dailyRate
        For each applicable surcharge rule: dayRate *= rule.multiplier
        (multipliers stack multiplicatively)
     c. dayCharge = Math.round(dayRate)
     d. accumulate: adjustedBase += dayCharge

3. Surcharge amount
   surchargeAmount = adjustedBase - (vehicle.dailyRate × totalDays)
   (may be 0 when no surcharge rules apply to any day)

4. Long-term discount
   - Find all active LongTermDiscountRule where rule.minDays <= totalDays
   - Pick the one with the lowest multiplier (best discount for customer)
   - discountAmount = Math.round(adjustedBase × (1 - bestRule.multiplier))
   - If no qualifying rule: discountAmount = 0

5. Applied rule names
   - Collect names of all rules that produced a non-zero effect:
     - Surcharge rules that matched at least one day
     - The long-term discount rule if applied

6. Extras (unchanged)
   extrasAmount = per-day extras × totalDays  (no rule adjustment on add-ons)

7. Return
   baseAmount   = vehicle.dailyRate × totalDays   (definition unchanged)
   totalAmount  = adjustedBase - discountAmount + extrasAmount
   surchargeAmount, discountAmount, appliedRuleNames as computed above
```

### Date range matching helper (internal)

```typescript
function dayMatchesDateRange(day: Date, rule: DateRangePricingRule): boolean {
  if (rule.recurring) {
    // Compare month (1-12) and day (1-31) only, ignoring year
    const [, startMM, startDD] = rule.startDate.split("-").map(Number);
    const [, endMM,   endDD]   = rule.endDate.split("-").map(Number);
    const dayMM = day.getMonth() + 1;
    const dayDD = day.getDate();
    const dayVal   = dayMM * 100 + dayDD;
    const startVal = startMM * 100 + startDD;
    const endVal   = endMM   * 100 + endDD;

    if (startVal <= endVal) {
      // Normal range within a calendar year e.g. Mar 5 – Apr 5
      return dayVal >= startVal && dayVal <= endVal;
    } else {
      // Wraps year boundary e.g. Dec 20 – Jan 3
      return dayVal >= startVal || dayVal <= endVal;
    }
  } else {
    // Fixed range: compare full dates
    const start = new Date(rule.startDate + "T00:00:00Z");
    const end   = new Date(rule.endDate   + "T00:00:00Z");
    const d     = new Date(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate()));
    return d >= start && d <= end;
  }
}
```

---

## New Service: `lib/services/pricingService.ts`

`server-only` — never imported by client components.

```typescript
export async function getPricingRules(): Promise<PricingRule[]>
// Fetches all active: true documents from pricing_rules collection.
// Returns [] if collection is empty or if FirebaseConfigError (dev/mock path).
// No caching — collection is tiny and booking creation is infrequent.

export async function computeBookingPricingWithRules(
  vehicle: Vehicle,
  extrasPricing: ExtrasPricing,
  extras: BookingExtras,
  startDate: Date,
  endDate: Date,
): Promise<BookingPricing>
// Convenience wrapper: fetches rules then calls computeBookingPricing.
// Use this at all API route pricing call sites (PI creation and booking creation).
```

### Error handling

`getPricingRules` must catch all errors:
- `FirebaseConfigError` → return `[]` silently (dev/mock path — flat rate still works)
- Other Firestore errors → `console.error` and return `[]` (degrade to flat rate, never block a booking)

---

## Integration Points

Codex must update the following two call sites to use `computeBookingPricingWithRules` instead of `computeBookingPricing`:

| File | Current call | Required change |
|---|---|---|
| `app/api/stripe/create-payment-intent/route.ts` | `computeBookingPricing(vehicle, extrasPricing, extras, start, end)` | `await computeBookingPricingWithRules(...)` |
| `app/api/bookings/create/route.ts` | `computeBookingPricing(vehicle, extrasPricing, extras, start, end)` | `await computeBookingPricingWithRules(...)` |

Both routes already run server-side. The PI amount and the stored `booking.pricing` will now reflect active rules.

The `computeBookingPricing` function in `lib/utils/pricing.ts` itself must remain a pure synchronous function (no Firestore dependency). `pricingService.ts` owns the Firestore fetch and calls `computeBookingPricing` internally.

---

## Seed Data

Create `lib/data/pricingRulesSeed.ts` with the following rules for Daytona Beach. This is used only for manual seeding via a one-off script — it is not imported at runtime.

| Type | Name | Config |
|---|---|---|
| `weekend` | Weekend Rate | weekdays: [5, 6, 0] — Fri/Sat/Sun · multiplier: 1.20 |
| `date_range` | Daytona 500 / Speed Weeks | Feb 5–Feb 22 · recurring · multiplier: 1.60 |
| `date_range` | Bike Week | Mar 5–Mar 15 · recurring · multiplier: 1.50 |
| `date_range` | Spring Break | Mar 10–Apr 5 · recurring · multiplier: 1.35 |
| `date_range` | Summer Season | Jun 15–Aug 15 · recurring · multiplier: 1.25 |
| `date_range` | Biketoberfest | Oct 14–Oct 20 · recurring · multiplier: 1.40 |
| `date_range` | Thanksgiving Week | Nov 23–Nov 30 · recurring · multiplier: 1.30 |
| `date_range` | Holiday Season | Dec 20–Jan 3 · recurring · multiplier: 1.40 |
| `long_term_discount` | Weekly Rate (7+ days) | minDays: 7 · multiplier: 0.90 (10% off) |
| `long_term_discount` | Extended Rate (14+ days) | minDays: 14 · multiplier: 0.85 (15% off) |
| `long_term_discount` | Monthly Rate (28+ days) | minDays: 28 · multiplier: 0.80 (20% off) |

---

## New Types File

Create `types/pricing.ts`:

```typescript
export type PricingRuleType = "weekend" | "date_range" | "long_term_discount";

export type WeekendPricingRule = {
  id: string;
  type: "weekend";
  name: string;
  multiplier: number;
  weekdays: number[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type DateRangePricingRule = {
  id: string;
  type: "date_range";
  name: string;
  multiplier: number;
  startDate: string;
  endDate: string;
  recurring: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type LongTermDiscountRule = {
  id: string;
  type: "long_term_discount";
  name: string;
  minDays: number;
  multiplier: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type PricingRule = WeekendPricingRule | DateRangePricingRule | LongTermDiscountRule;
```

Add to `types/index.ts` barrel:
```typescript
export * from "./pricing";
```

---

## Display: Pricing Breakdown in UI

The `appliedRuleNames` and `surchargeAmount` / `discountAmount` fields are available in `booking.pricing` wherever a booking is shown. DCR-035 (Codex) must surface this data in two places:

**1. `components/booking/PriceSummary.tsx` (booking wizard Step 4)**

Show a breakdown after the base rate line:
```
7 days × $99/day            $693
Weekend surcharge           +$40
Spring Break premium        +$94
Weekly discount (10% off)  −$83
───────────────────────────────
Subtotal (before extras)   $744
Add-ons                     +$45
───────────────────────────────
Total                       $789
Deposit due now             $300
Balance at pickup           $489
```

Only show surcharge/discount lines when the amounts are non-zero. Do not show individual rule names as separate line items — group them into a single "Peak season surcharge" line when multiple date_range rules apply simultaneously. The `appliedRuleNames` list is used only for the tooltip/popover detail if implemented.

**2. `app/(customer)/dashboard/bookings/[bookingId]/page.tsx` (customer portal)**

Add the surcharge/discount lines to the existing Pricing Summary card using the same pattern. Display only when non-zero.

---

## Deliverables for DCR-035

Codex must produce:

- [ ] `types/pricing.ts` — new types as specified
- [ ] `types/index.ts` — barrel updated
- [ ] `types/booking.ts` — `BookingPricing` extended with optional new fields
- [ ] `lib/utils/pricing.ts` — `computeBookingPricing` updated with optional `rules` param and per-day algorithm
- [ ] `lib/services/pricingService.ts` — `getPricingRules`, `computeBookingPricingWithRules`
- [ ] `lib/data/pricingRulesSeed.ts` — seed data for manual import
- [ ] `app/api/stripe/create-payment-intent/route.ts` — updated to use `computeBookingPricingWithRules`
- [ ] `app/api/bookings/create/route.ts` — updated to use `computeBookingPricingWithRules`
- [ ] `components/booking/PriceSummary.tsx` — updated to show surcharge/discount lines
- [ ] `app/(customer)/dashboard/bookings/[bookingId]/page.tsx` — pricing card updated
- [ ] `firestore.rules` — `pricing_rules` rule added
- [ ] `npm run build` passes

---

## What is NOT in scope

- Admin UI for managing pricing rules (future task)
- Per-vehicle pricing rule overrides
- Per-customer pricing tiers (DCR-033 repeat customer territory)
- Currency other than USD cents
- Retroactive repricing of existing bookings
