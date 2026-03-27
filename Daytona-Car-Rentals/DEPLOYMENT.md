# Deployment Guide — Daytona Car Rentals

**Target:** Vercel (app) + Firebase (Firestore, Auth, Storage) + Stripe

---

## Prerequisites

- Node.js 20+
- Firebase CLI: `npm install -g firebase-tools`
- Vercel CLI: `npm install -g vercel`
- A Firebase project (Blaze plan — required for Storage and Admin SDK)
- A Stripe account

---

## 1. Firebase Setup

### 1a. Create Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project: `daytona-car-rentals`
3. Upgrade to Blaze plan (pay-as-you-go — required for Storage rules and Cloud Functions)

### 1b. Enable services

In the Firebase console:
- **Authentication** → Sign-in method → Enable Email/Password and Google
- **Firestore Database** → Create database → Start in production mode → Region: `us-central1`
- **Storage** → Get started → Region: `us-central1`

### 1c. Get client config

Firebase console → Project Settings → Your apps → Add app → Web

Copy the config object. These become `NEXT_PUBLIC_FIREBASE_*` env vars.

### 1d. Create service account

Firebase console → Project Settings → Service accounts → Generate new private key

Download the JSON file. Extract these three values:
- `project_id` → `FIREBASE_PROJECT_ID`
- `client_email` → `FIREBASE_CLIENT_EMAIL`
- `private_key` → `FIREBASE_PRIVATE_KEY` (keep the `\n` newlines — Vercel handles them correctly)

Also set the storage bucket:
- Firebase console → Storage → the `gs://...` URL shown at the top → `FIREBASE_STORAGE_BUCKET`

**Never commit this file.**

### 1e. Set Firebase Admin custom claims

Users need a `role` custom claim for admin access. Set this via Firebase Admin SDK or the Firebase console extension. Example using Admin SDK in a one-off script:

```ts
import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

const app = initializeApp({ credential: cert('./service-account.json') })
await getAuth(app).setCustomUserClaims(USER_UID, { role: 'admin' })
```

### 1f. Deploy Firestore rules and indexes

```bash
firebase login
firebase use daytona-car-rentals

# Deploy security rules
firebase deploy --only firestore:rules
firebase deploy --only storage

# Deploy composite indexes (required before queries work in production)
firebase deploy --only firestore:indexes
```

### 1g. Seed extras pricing document

The booking flow requires `extras_pricing/current` to exist in Firestore. Create it once:

```ts
// run once via Admin SDK or Firebase console
{
  additionalDriver: 1500,   // $15.00/day in cents
  gps: 1000,                // $10.00/day
  childSeat: 800,           // $8.00/day
  cdw: 2500,                // $25.00/day
  updatedAt: new Date()
}
```

---

## 2. Stripe Setup

### 2a. Get API keys

Stripe dashboard → Developers → API keys

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Publishable key (safe for browser)
- `STRIPE_SECRET_KEY` — Secret key (server only, never expose)

### 2b. Configure webhook

After deploying to Vercel:

1. Stripe dashboard → Developers → Webhooks → Add endpoint
2. Endpoint URL: `https://your-domain.vercel.app/api/stripe/webhook`
3. Events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
4. Copy the **Signing secret** → `STRIPE_WEBHOOK_SECRET`

For local development, use Stripe CLI:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
# outputs a whsec_... signing secret for local use
```

---

## 3. Environment Variables

### Local (`.env.local`)

Copy `.env.local.example` to `.env.local` and fill in all values:

```bash
cp .env.local.example .env.local
```

### Vercel (production)

Vercel dashboard → Project → Settings → Environment Variables

Add every variable from `.env.local.example`. For `FIREBASE_ADMIN_PRIVATE_KEY`, paste the raw value including newlines — Vercel stores it correctly.

Alternatively, use the Vercel CLI:
```bash
vercel env add STRIPE_SECRET_KEY production
```

---

## 4. Vercel Deployment

### 4a. First deploy

```bash
# From the project root
vercel

# Follow prompts:
# - Link to existing project or create new
# - Framework preset: Next.js (auto-detected)
# - Root directory: ./  (or "app (Next.js)" if using the subdirectory)
# - Build command: next build
# - Output directory: .next
```

### 4b. Set production domain

Vercel dashboard → Project → Settings → Domains → Add `daytonacarrentals.com`

Update `NEXT_PUBLIC_APP_URL` env var to match.

### 4c. Subsequent deploys

```bash
vercel --prod
```

Or connect the GitHub repository for automatic deploys on push to `main`.

### 4d. Build verification

After deploy, confirm:
- `https://your-domain.com` loads
- `https://your-domain.com/api/vehicles/availability` returns 400 (no body) — confirms API routes are live
- Firebase connection: create a test vehicle in Firestore, visit `/fleet`
- Stripe webhook: use Stripe dashboard to send a test event to the webhook endpoint

---

## 5. Firebase Storage CORS (if needed)

If images fail to load in the browser due to CORS, set the Storage CORS config:

```json
// cors.json
[
  {
    "origin": ["https://daytonacarrentals.com", "http://localhost:3000"],
    "method": ["GET"],
    "maxAgeSeconds": 3600
  }
]
```

```bash
gcloud storage buckets update gs://YOUR_BUCKET_NAME --cors-file=cors.json
```

---

## 6. next.config.ts — Image Domains

Already configured in `next.config.ts`:

```ts
images: {
  remotePatterns: [
    { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
  ],
},
```

---

## 7. Vehicle Images — Storage URL Requirement

The app uses `next/image` to render vehicle photos. Images in Firestore's `vehicles/{id}.images[]` array **must be stored as full HTTPS download URLs**, not as raw Firebase Storage paths.

When uploading a vehicle image via the admin fleet form or a seed script, retrieve the download URL after upload and store that:

```ts
// After uploading to Storage:
const downloadUrl = await getDownloadURL(storageRef)
// Store downloadUrl (https://firebasestorage.googleapis.com/...) in Firestore, not the storage path
```

Raw storage paths (e.g. `vehicles/abc/hero.jpg`) will silently fall back to the placeholder SVG.

---

## 8. Post-Deployment Checklist

- [ ] Firestore rules deployed and active
- [ ] Storage rules deployed and active
- [ ] Composite indexes deployed (check Firebase console — may take a few minutes to build)
- [ ] `extras_pricing/current` document seeded
- [ ] Stripe webhook endpoint registered and receiving events
- [ ] At least one admin user has `role: 'admin'` custom claim set
- [ ] At least one vehicle document in Firestore with full HTTPS image download URLs
- [ ] `NEXT_PUBLIC_APP_URL` matches actual domain
- [ ] No `.env.local` committed to git (verify `.gitignore`)

---

## 9. Dependency Audit Note

`npm audit` may report a low-severity transitive vulnerability chain under `firebase-admin`:

`firebase-admin -> @google-cloud/storage -> teeny-request -> http-proxy-agent -> @tootallnate/once`

Current project status:
- `firebase-admin` is intentionally on `13.7.0`
- `package.json` and `package-lock.json` are aligned
- the affected chain is primarily tied to Firebase Admin Storage usage, especially signed document preview URLs

Operational guidance:
- do **not** run `npm audit fix --force` on this project as a routine deployment step
- the force fix can propose breaking dependency changes and is not appropriate here for a low-severity transitive issue
- instead, track this as dependency maintenance and revisit during intentional `firebase-admin` / Google Cloud package upgrades
- always re-run `npm run build` after any dependency update

This is a maintenance note, not a launch blocker.

---

## 10. Local Development

See [DEVELOPMENT.md](DEVELOPMENT.md) for local setup instructions.
