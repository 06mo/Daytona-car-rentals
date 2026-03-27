# DCR-057 — Magic Link Authentication Flow

**Owner:** Claude
**Status:** Complete
**Blocks:** DCR-058, DCR-059, DCR-060, DCR-061, DCR-062

---

## Overview

Magic link authentication lets users verify their identity with just an email address — no password required. Firebase Authentication's `signInWithEmailLink` handles the link generation and verification. The key design goal is **zero checkout interruption**: a user who starts booking without being logged in can authenticate via email and resume exactly where they left off.

---

## Authentication Flow

```
1. User reaches Step 5 (Payment) without a session
   └─ Show EmailEntryStep instead of Stripe Elements
      "Enter your email to continue — we'll send you a secure link."

2. User submits email
   └─ POST /api/auth/magic-link
      └─ firebase.auth().sendSignInLinkToEmail(email, actionCodeSettings)
      └─ store email in localStorage: 'pendingMagicLinkEmail'

3. User receives email, clicks link
   └─ Link target: /auth/verify?mode=signIn&oobCode=...&continueUrl=...

4. /auth/verify page
   └─ Read email from localStorage
   └─ firebase.auth().signInWithEmailLink(email, window.location.href)
   └─ Firebase verifies link → returns UserCredential
   └─ If new user: POST /api/auth/complete-registration (create Firestore profile)
   └─ Redirect to continueUrl (booking flow or last page)

5. User returns to booking flow, now authenticated
   └─ Session state is restored from localStorage/sessionStorage
   └─ Booking flow continues from where it stopped
```

---

## `actionCodeSettings` Configuration

```ts
const actionCodeSettings = {
  url: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/verify?continueUrl=${encodeURIComponent(continueUrl)}`,
  handleCodeInApp: true,
}
```

- `handleCodeInApp: true` — Firebase routes the link back to the web app, not a native app
- `continueUrl` — the page to return to after verification. For booking flow: `/booking/[vehicleId]?resume=true`
- `NEXT_PUBLIC_SITE_URL` must be set in `.env.local` (e.g., `https://daytonacarrentals.com`)

---

## Firebase Console Configuration

The magic link flow requires the following to be enabled in Firebase Console:
- Authentication → Sign-in providers → Email/Password → **Email link (passwordless sign-in)**: enabled
- Authentication → Settings → Authorized domains: add your production domain

---

## API Routes

### `POST /api/auth/magic-link`

Sends the magic link email.

**Auth:** Public (no Firebase ID token required — user is not yet authenticated).

**Rate limit:** Applies `rateLimitPolicies.magicLink` — 3 requests per email address per 10 minutes to prevent spam.

**Request body:**
```ts
{ email: string; continueUrl?: string }
```

**Server logic:**
```
1. Validate email format
2. Enforce rate limit by email address (not IP — email is the limiting factor)
3. firebase.auth().generateSignInWithEmailLink(email, actionCodeSettings)
   Note: This generates the link server-side using Firebase Admin SDK.
   This is preferred over client-side sendSignInLinkToEmail because:
     a. We can log the event
     b. We can apply server-side rate limiting
     c. We can customize the email via a Resend template
4. Send email via Resend with custom template (not Firebase's default email)
5. Return { sent: true }
```

**Why Resend instead of Firebase's built-in email?**
Firebase's default magic link email is generic and unbranded. Resend lets us use our `MagicLinkEmail` template that matches the site design.

**Error responses:**
- `400` — invalid email format
- `429` — rate limited
- `500` — Firebase or email sending error (log internally, return generic message)

---

### `POST /api/auth/complete-registration`

Called after successful `signInWithEmailLink` for new users only.

**Auth:** Requires valid Firebase ID token (user just authenticated via magic link).

**Request body:**
```ts
{ displayName?: string }
```

**Server logic:**
```
1. Verify Firebase ID token → get userId, email
2. Check if users/{userId} already exists
3. If not exists:
     a. Create users/{userId} with:
          email, role: 'customer', verificationStatus: 'unverified',
          createdAt, updatedAt, lastLoginAt
          displayName = body.displayName || email.split('@')[0]
     b. Set custom claim: role = 'customer'
        firebase.auth().setCustomUserClaims(userId, { role: 'customer' })
4. If exists: update lastLoginAt
5. Return { user }
```

**When to call:** Client calls this once after `signInWithEmailLink` succeeds. It is idempotent — safe to call on subsequent logins (step 4 just updates `lastLoginAt`).

---

## Client Pages

### `/auth/verify/page.tsx`

This page handles the magic link return URL.

```ts
'use client'

// On mount:
useEffect(() => {
  if (!isSignInWithEmailLink(auth, window.location.href)) {
    // Not a valid magic link — redirect to login
    router.replace('/login')
    return
  }

  let email = localStorage.getItem('pendingMagicLinkEmail')

  if (!email) {
    // Email missing from localStorage (different device, cleared storage)
    // Show email input field: "Please re-enter your email to confirm."
    setNeedsEmailConfirmation(true)
    return
  }

  signInWithEmailLink(auth, email, window.location.href)
    .then(async (result) => {
      localStorage.removeItem('pendingMagicLinkEmail')
      const idToken = await result.user.getIdToken()
      await fetch('/api/auth/complete-registration', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: result.user.displayName }),
      })
      const continueUrl = new URLSearchParams(window.location.search).get('continueUrl') ?? '/dashboard'
      router.replace(continueUrl)
    })
    .catch(() => {
      setError('This link is invalid or has expired. Please request a new one.')
    })
}, [])
```

**States:**
- Loading: "Verifying your link..."
- Success: redirect (no UI shown)
- Cross-device (needs email): email input form
- Error: "Link invalid or expired. [Request a new link]"

---

### `/auth/magic-link-sent/page.tsx`

Shown immediately after the user submits their email.

```
📧 Check your email

We sent a secure sign-in link to:
  you@example.com

Click the link in the email to continue.
The link expires in 1 hour.

[Use a different email] [Resend]
```

---

## Booking Flow Integration (DCR-059)

### AuthGate component

```ts
// components/booking/AuthGate.tsx
// Wraps Step 5 Payment — renders children if authenticated, EmailEntryStep if not

export function AuthGate({ children }: { children: ReactNode }) {
  const [user, loading] = useAuthState(auth)

  if (loading) return <Spinner />
  if (user) return children
  return <EmailEntryStep />
}
```

### EmailEntryStep

Renders inside the booking wizard at Step 5 if user is not authenticated.

```
┌──────────────────────────────────────────────────────┐
│  One last step — verify your identity                │
│                                                      │
│  Enter your email and we'll send you a secure        │
│  link to complete your booking.                      │
│                                                      │
│  Email  [___________________________]                │
│                                                      │
│  [← Back]         [Send Secure Link →]              │
└──────────────────────────────────────────────────────┘
```

After email submit: redirect to `/auth/magic-link-sent`.

### Booking state preservation across the magic link round-trip

The booking wizard state must survive the email → verify redirect cycle.

**Strategy:** Serialize `BookingState` to `sessionStorage` on every context update. On wizard mount, read `sessionStorage` first to rehydrate.

```ts
// In BookingProvider.tsx:
// On every state change:
useEffect(() => {
  sessionStorage.setItem(`booking_draft_${state.vehicleId}`, JSON.stringify(state))
}, [state])

// On mount (initial state):
useState<BookingState>(() => {
  const saved = sessionStorage.getItem(`booking_draft_${vehicle.id}`)
  if (saved) return { ...JSON.parse(saved), step: 5 }  // resume at step 5
  return defaultState
})
```

The `continueUrl` passed to the magic link is `/booking/[vehicleId]?resume=true`. When the wizard mounts with `resume=true`, it reads `sessionStorage` and jumps directly to step 5.

**What is persisted in sessionStorage:** All `BookingState` fields except `pricing` (recomputed on mount) and `documents` (re-fetched from server on step 3). Protected data (payment intent ID) must NOT be in sessionStorage.

---

## Email Template

### `emails/MagicLinkEmail.tsx`

```tsx
// Resend React Email template
export function MagicLinkEmail({ magicLink, expiresInMinutes = 60 }: { magicLink: string; expiresInMinutes?: number }) {
  return (
    <Html>
      <Head />
      <Body>
        <Container>
          <Heading>Sign in to Daytona Car Rentals</Heading>
          <Text>Click the button below to sign in. This link expires in {expiresInMinutes} minutes.</Text>
          <Button href={magicLink}>Sign In Securely</Button>
          <Text style={{ color: '#6b7280', fontSize: 12 }}>
            If you didn't request this, you can safely ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
```

---

## Session Persistence

Firebase client SDK persists authentication state in `localStorage` by default (via `setPersistence(auth, browserLocalPersistence)`). This means:
- After magic link sign-in, the user remains signed in across page refreshes and browser restarts
- No additional session management required on the client side

On server-side API routes, authentication is always verified via `Authorization: Bearer <idToken>` header. The ID token is short-lived (1 hour) but automatically refreshed by the Firebase client SDK.

---

## Edge Cases

### Cross-device sign-in (email on phone, link clicked on laptop)

Firebase supports this but requires the email to be re-entered on the new device because `localStorage` is per-device. The `/auth/verify` page handles this with the `needsEmailConfirmation` state and an email input.

### Expired links

Firebase magic links expire after 1 hour. The verify page catches the `auth/invalid-action-code` Firebase error and shows: "This link is invalid or has expired. [Request a new link]"

### Existing account with same email

`signInWithEmailLink` signs into the existing Firebase Auth account associated with that email. The `complete-registration` handler checks `if users/{userId} exists` — for returning users it only updates `lastLoginAt`. No duplicate accounts are created.

### Multiple pending links

If a user requests the link twice, the second link invalidates the first. This is handled by Firebase automatically.

---

## Acceptance Criteria (DCR-058)

- [ ] `POST /api/auth/magic-link` sends email via Resend with branded `MagicLinkEmail` template
- [ ] Rate limit: 3 requests per email per 10 minutes; returns 429 with `Retry-After`
- [ ] `/auth/verify` handles valid link: calls `signInWithEmailLink`, then `complete-registration`, then redirects to `continueUrl`
- [ ] `/auth/verify` handles missing email in localStorage: shows email re-entry form
- [ ] `/auth/verify` handles expired/invalid link: shows error with "Request new link" button
- [ ] `complete-registration` creates Firestore user profile on first sign-in; idempotent on subsequent
- [ ] `complete-registration` sets `role: 'customer'` custom claim via Firebase Admin
- [ ] `/auth/magic-link-sent` page renders correctly with email displayed
- [ ] Firebase Email Link sign-in method enabled in project (documented in deployment checklist)

---

## TypeScript Files to Create/Modify

| File | Action |
|---|---|
| `app/api/auth/magic-link/route.ts` | Create — send magic link via Admin SDK + Resend |
| `app/api/auth/complete-registration/route.ts` | Create — create/update user profile post-auth |
| `app/(auth)/auth/verify/page.tsx` | Create — magic link verification page |
| `app/(auth)/auth/magic-link-sent/page.tsx` | Create — confirmation screen |
| `components/booking/AuthGate.tsx` | Create — auth wrapper for Step 5 |
| `components/booking/steps/EmailEntryStep.tsx` | Create — email input UI for unauthenticated users at Step 5 |
| `components/providers/BookingProvider.tsx` | Modify — add sessionStorage persistence + rehydration |
| `emails/MagicLinkEmail.tsx` | Create — Resend email template |
| `lib/security/rateLimit.ts` | Modify — add `magicLink` rate limit policy |
