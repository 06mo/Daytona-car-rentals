# Development Guide — Daytona Car Rentals

---

## Prerequisites

- Node.js 20+
- npm 10+
- A Firebase project (see [DEPLOYMENT.md](DEPLOYMENT.md) for setup)
- A Stripe account

---

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Fill in `.env.local` with your Firebase and Stripe credentials. See `.env.local.example` for all required variables.

**Minimum required to run locally:**
- `NEXT_PUBLIC_FIREBASE_*` — client SDK config (from Firebase console)
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` — Admin SDK (from service account JSON)

Stripe keys are only required for the payment flow (DCR-017+). The app runs without them for UI development.

### 3. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Stripe webhook (local)

Install the Stripe CLI and forward events to your local server:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the `whsec_...` output into `STRIPE_WEBHOOK_SECRET` in `.env.local`.

---

## Project Structure

```
app/
  (public)/         Unauthenticated pages — homepage, fleet, vehicle detail
  (auth)/           Auth pages — login, register, forgot password
  (customer)/       Protected — customer dashboard, booking flow, profile
  (admin)/          Protected (admin role) — dashboard, bookings, fleet, customers
  api/              Server-only API routes
  layout.tsx        Root layout
  globals.css

components/
  ui/               Primitive design system — Button, Card, Input, Badge, Modal, Spinner
  layout/           Navbar, Footer, SiteShell
  fleet/            VehicleCard, VehicleGrid, VehicleFilters, VehicleImageGallery
  booking/          BookingWizard, step components, DateRangePicker, PriceSummary
  documents/        DocumentUpload, DocumentPreview, VerificationStatus
  admin/            StatsCard, BookingTable, DocumentReviewPanel, RevenueChart
  providers/        AuthProvider, BookingProvider, ToastProvider

lib/
  firebase/         client.ts, admin.ts, converters.ts, firestore.ts
  stripe/           server.ts (server-only), client.ts (browser)
  services/         vehicleService, bookingService, userService, documentService
  middleware/       withAuth.ts
  hooks/            useAuth, useBooking, useVehicles, useAvailability, useUpload
  utils/            pricing.ts, dateUtils.ts, validation.ts, formatters.ts, cn.ts

types/              Domain types — vehicle, booking, user, document, payment
ai/                 Design specs, architecture docs, implementation log
```

---

## Conventions

### Server vs Client components

- All components are **React Server Components by default**
- Add `'use client'` only when the component needs state, effects, or event handlers
- All files under `lib/firebase/`, `lib/stripe/server.ts`, and `lib/services/` have `import 'server-only'` — they will throw a build error if imported in a client component

### TypeScript

- Strict mode is on. No `any`, no `@ts-ignore` without a comment explaining why.
- All Firestore reads/writes use the typed helpers from `lib/firebase/firestore.ts`
- All domain types are in `types/` and re-exported from `types/index.ts`

### Styling

- Tailwind utility classes only. No inline `style={{}}` except for truly dynamic values (e.g. progress bar width).
- Use `cn()` from `lib/utils/cn.ts` for conditional class merging — it handles `clsx` + `tailwind-merge` conflicts.
- Brand colours: `brand.DEFAULT` (dark navy), `brand.accent` (orange `#f97316`), `brand.surface` (light grey).
- Never hardcode hex values in component files.

### API routes

- All routes that read or write user data use `withAuth` or `requireAuth` from `lib/middleware/withAuth.ts`
- Amount / pricing values are always computed server-side from Firestore. Never trust client-supplied totals.
- All error responses use `{ error: string }` shape with appropriate HTTP status codes.

### Firestore

- All reads and writes go through the helpers in `lib/firebase/firestore.ts` — never call `requireDb()` directly in a service or route except for transactions.
- Dates are stored as Firestore Timestamps. The `serializeFirestoreData` / `deserializeFirestoreData` converters handle the conversion automatically on every read and write.
- The `documentId = type` pattern for user documents (`drivers_license` / `insurance_card`) means re-uploading overwrites in place. Do not generate new IDs for document sub-collection entries.

### Forms

- Use `react-hook-form` + `zod` resolver for all forms.
- Zod schemas live in `lib/utils/validation.ts`.
- Each booking wizard step has its own Zod schema; the wizard validates before advancing.

---

## Available Scripts

| Script | Command | Notes |
|---|---|---|
| Dev server | `npm run dev` | Hot reload on [localhost:3000](http://localhost:3000) |
| Production build | `npm run build` | Fails on TypeScript errors |
| Start production | `npm run start` | Requires `npm run build` first |
| Lint | `npm run lint` | ESLint via Next.js config |

---

## Firebase Emulators (optional)

For fully offline development:

```bash
# Install emulators
firebase init emulators
# Select: Authentication, Firestore, Storage

# Start emulators
firebase emulators:start

# Point the app at emulators — add to .env.local:
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true
```

Add emulator detection to `lib/firebase/client.ts` and `lib/firebase/admin.ts` if using this workflow.

---

## Adding a New Vehicle (development seed)

Use the Firebase console or a seed script to add a vehicle document to the `vehicles` collection:

```json
{
  "make": "Toyota",
  "model": "Camry",
  "year": 2023,
  "category": "economy",
  "dailyRate": 8500,
  "depositAmount": 20000,
  "images": [],
  "features": ["Bluetooth", "Backup Camera", "USB Ports"],
  "seats": 5,
  "transmission": "automatic",
  "mileagePolicy": "unlimited",
  "available": true,
  "location": "Daytona Beach Airport",
  "description": "A comfortable and fuel-efficient choice for exploring Daytona.",
  "createdAt": "2026-03-26T00:00:00Z",
  "updatedAt": "2026-03-26T00:00:00Z"
}
```

---

## Common Issues

**`FirebaseConfigError: Firebase Admin credentials are not configured`**
→ Check that `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` are set in `.env.local`. Restart the dev server after changes.

**`StripeConfigError: Stripe server credentials are not configured`**
→ `STRIPE_SECRET_KEY` is not set. Required only for payment flow.

**Images not loading from Firebase Storage**
→ Add `firebasestorage.googleapis.com` to `images.remotePatterns` in `next.config.ts`.

**Firestore query missing index error**
→ Run `firebase deploy --only firestore:indexes`. The Firebase console error message contains a direct link to create the missing index.

**`Authentication required` on API routes**
→ Ensure the Firebase ID token is sent as `Authorization: Bearer <token>` or in the `__session` cookie.
