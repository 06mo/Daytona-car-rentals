# DCR-022 — Admin Middleware Hardening Spec

**Owner:** Claude (design)
**Implementer:** Codex (DCR-023)
**Status:** Complete

---

## Problem

The current admin route protection has two layers, but the second layer is missing the role check:

1. **Edge middleware** (`middleware.ts`) — checks that `__session` or `token` cookie is present. If absent, redirects to `/login`. Does **not** verify the token signature or check `role === 'admin'`.

2. **RSC layout** (`app/(admin)/layout.tsx`) — renders the sidebar and calls `listAdminUsers()`. Does **not** verify the token or check role at all.

**Result**: Any authenticated user — including a customer who went through `/login` and has a valid `__session` cookie — can reach all `/admin/*` pages. They see full customer data, booking history, fleet details, and document review panels. The admin API routes (`/api/admin/*`) correctly reject non-admins via `withAuth` + role check, so no write actions go through — but read exposure is real.

---

## Chosen Approach: Server-Side Auth in Admin RSC Layout

Edge middleware cannot use Firebase Admin SDK (Node.js APIs are unavailable in the edge runtime). Rather than adding a fragile JWT-parsing layer at the edge, full token verification and role enforcement belongs in `app/(admin)/layout.tsx` as an async RSC — the same pattern already used in `app/(customer)/layout.tsx`.

The edge middleware retains its current role: fast cookie-presence check for UX redirect before the page renders. It is not the security boundary.

---

## Acceptance Criteria for DCR-023

### 1. Update `app/(admin)/layout.tsx`

Replace the current layout (which only fetches pending count and renders the sidebar) with one that:

**Step 1 — Read session token**
```ts
const cookieStore = await cookies();
const headerStore = await headers();
const sessionToken =
  cookieStore.get("__session")?.value ??
  cookieStore.get("token")?.value;
const returnUrl = headerStore.get("x-return-url") ?? "/admin/dashboard";
```

**Step 2 — Redirect if no token**
```ts
if (!sessionToken) {
  redirect(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
}
```

**Step 3 — Get Admin Auth instance**
```ts
const adminAuth = getAdminAuth();
if (!adminAuth) {
  // Firebase Admin not configured — fail closed, redirect to login
  redirect(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
}
```

**Step 4 — Verify token**
```ts
let decodedToken: DecodedIdToken;
try {
  decodedToken = await adminAuth.verifyIdToken(sessionToken);
} catch {
  redirect(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
}
```

**Step 5 — Enforce admin role**
```ts
if (decodedToken.role !== "admin") {
  redirect("/dashboard"); // send non-admins to customer dashboard, not login
}
```

**Step 6 — Proceed as before**
```ts
const pendingCount = (await listAdminUsers()).filter(
  (user) => user.verificationStatus === "pending"
).length;

return (
  <div className="...">
    <AdminSidebar pendingCount={pendingCount} />
    <div>{children}</div>
  </div>
);
```

### 2. Required imports for the layout

```ts
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getAdminAuth } from "@/lib/firebase/admin";
```

### 3. Do NOT change `middleware.ts`

The edge middleware stays as-is. Its cookie-presence check provides a fast UX redirect; the layout provides the actual security boundary. This matches the pattern already in use for customer routes.

### 4. Do NOT change any API routes

All `/api/admin/*` routes already enforce `role === 'admin'` via `withAuth`. No changes needed there.

---

## Behavior Matrix

| User state | Edge middleware | Admin layout | Result |
|---|---|---|---|
| No cookie | Redirects to `/login?returnUrl=…` | Never reached | Redirected to login |
| Cookie present, invalid/expired token | Passes through | `verifyIdToken` throws → redirects to login | Redirected to login |
| Cookie present, valid token, role = `customer` | Passes through | Role check fails → redirects to `/dashboard` | Sent to customer dashboard |
| Cookie present, valid token, role = `admin` | Passes through | All checks pass → renders layout | Admin panel rendered |
| No Firebase Admin config | Passes through (cookie present) | `getAdminAuth()` returns null → redirects to login | Redirected to login |

---

## Notes

- Non-admin authenticated users are redirected to `/dashboard` (not `/login`) — they have a valid session, just not the right role. This avoids a confusing "you need to log in" message for customers who stumble onto `/admin`.
- The `getAdminAuth()` null case fails closed (redirect to login). This is intentional: without real Firebase Admin config, the admin panel cannot function safely.
- `DecodedIdToken` has a `role` field because the Firebase Admin SDK supports custom claims on the decoded token object. The `withAuth` middleware already reads `decodedToken.role` for this project.
