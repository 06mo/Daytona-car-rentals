# DCR-062 — Magic Link Auth Integrity Hardening

**Owner:** Claude
**Status:** Complete
**Depends on:** DCR-058 (implemented)

---

## Objective

Audit the end-to-end magic link + booking flow for integrity gaps and define enforcement rules that Codex must implement. The goal is to ensure that (a) session tokens are issued and stored correctly, (b) booking and document ownership cannot be spoofed via the passwordless path, (c) the `complete-registration` endpoint cannot be abused, and (d) `continueUrl` cannot be used as an open redirect vector.

---

## Verified-Safe (no new work required)

These were audited and found correct. Document them so future maintainers understand the trust model.

### 1. Booking `userId` is always server-authoritative

`app/api/bookings/create/route.ts` sets `userId` from `user.userId` (the Firebase ID token verified by `requireAuth`). The request body is never trusted for identity. Additionally, the route cross-checks `paymentIntent.metadata.userId !== user.userId` (line 89) — if a client swaps PI IDs between users, the request is rejected 403.

### 2. Document ownership enforced at Storage rules

`storage.rules` enforces `request.auth.uid == userId` for all writes to `users/{userId}/documents/**`. A client cannot write documents into another user's path regardless of what is passed as `userId` prop in the component. The prop is the desired path prefix; Storage rules are the authoritative guard.

### 3. `userId` in Step3 sourced from `auth.currentUser.uid`

`Step3Documents` reads `userId` from `getClientServices()?.auth.currentUser?.uid` — not from the booking provider state and not from a URL parameter. There is no injection vector.

### 4. `resumeStep` URL parameter is clamped

`BookingProvider` applies `Math.min(Math.max(initialResumeStep ?? storedStep, 1), 5)` — an out-of-range `resumeStep` in the URL cannot advance a user past a step they haven't reached.

### 5. PI metadata userId match at booking creation

`paymentIntent.metadata.userId` is verified to match the authenticated user before the booking is persisted. Cross-account payment reuse is rejected server-side.

---

## Required Fixes (Codex to implement)

### Fix 1 — Add `Secure` flag to `setSessionCookie` (I-026)

**File:** `lib/auth/clientSession.ts`

**Current:**
```ts
document.cookie = `__session=${token}; path=/; max-age=3600; SameSite=Strict`;
```

**Required:**
```ts
document.cookie = `__session=${token}; path=/; max-age=3600; SameSite=Strict; Secure`;
```

Apply the same fix to `clearSessionCookie`. Without `Secure`, the session token can be transmitted over HTTP. Vercel enforces HTTPS in production, but the flag is the correct defence-in-depth for any session cookie.

---

### Fix 2 — Rate-limit `complete-registration` per userId

**File:** `app/api/auth/complete-registration/route.ts`

The endpoint requires a valid Firebase Bearer token (so the caller must already be authenticated), but there is currently no rate limit. A client with a valid token could call this endpoint in a tight loop, causing repeated Firestore reads and writes.

Add a `userId`-scoped rate limit using the existing `enforceRateLimit` infrastructure. Add the policy to `lib/security/rateLimit.ts`:

```ts
completeRegistration: { id: "complete-registration", limit: 10, windowMs: 60 * 60 * 1000 },
```

Apply it at the top of the `POST` handler after `requireAuth` resolves the `user`:

```ts
const user = await requireAuth(request);
const limitResponse = enforceRateLimit(request, rateLimitPolicies.completeRegistration, user.userId);
if (limitResponse) return limitResponse;
```

---

### Fix 3 — Tighten `continueUrl` allowlist in `magic-link/route.ts`

**File:** `app/api/auth/magic-link/route.ts`

**Current:** `normalizeContinueUrl` accepts any path that starts with `/`. This allows a crafted request to redirect to `/admin/bookings` after authentication. The admin layout would block a non-admin user, but the redirect still occurs and could be confusing or exploited for phishing if an admin account is compromised.

**Required:** Restrict to known safe path prefixes:

```ts
const ALLOWED_CONTINUE_PREFIXES = ["/booking/", "/dashboard", "/auth/"];

function normalizeContinueUrl(value?: string) {
  if (!value) return "/dashboard";
  if (ALLOWED_CONTINUE_PREFIXES.some((prefix) => value.startsWith(prefix))) {
    return value;
  }
  return "/dashboard";
}
```

---

### Fix 4 — Guard admin role from `complete-registration` claim clobber

**File:** `app/api/auth/complete-registration/route.ts`

**Current:** `setCustomUserClaims({ role: "customer" })` is called only when `!existing` (no Firestore profile). In practice this means an admin with a Firestore profile is safe. However, the guard is implicit — if an admin's profile were deleted from Firestore, the next magic link sign-in would overwrite their `role: 'admin'` claim with `role: 'customer'`.

**Required:** Make the admin guard explicit. Only set the claim when both conditions are true: `!existing` AND the current token does not already carry `role === 'admin'`:

```ts
if (!existing && user.role !== "admin") {
  const adminAuth = getAdminAuth();
  if (adminAuth) {
    await adminAuth.setCustomUserClaims(user.userId, { role: "customer" });
  }
}
```

Note: `user.role` is already extracted from the verified Firebase ID token by `requireAuth`, so no additional token read is needed.

---

## Non-Issues (acknowledged, no action)

- **`continueUrl` in `BookingRecoveryPanel`** is constructed client-side from `usePathname()` + `useSearchParams()` — not user-injectable from URL input.
- **`isBookingRecovery` detection in magic-link-sent page** uses `continueUrl.startsWith("/booking/")` — cosmetic only; no security consequence.
- **Double `onAuthStateChanged` listeners** (AuthGate + BookingRecoveryPanel) — both properly unsubscribed via returned cleanup; minor overhead accepted.
- **`complete-registration` concurrent call race** — `upsertUserProfile` is last-write-wins for non-critical fields; `setCustomUserClaims` is idempotent. Safe.

---

## Acceptance Criteria

- [ ] `setSessionCookie` and `clearSessionCookie` include `; Secure` flag
- [ ] `complete-registration` returns 429 when rate limit exceeded (10 calls/hour/user)
- [ ] `normalizeContinueUrl` falls back to `/dashboard` for any path not in the allowlist
- [ ] `complete-registration` does not call `setCustomUserClaims` when `user.role === 'admin'`
- [ ] `npx tsc --noEmit` passes
