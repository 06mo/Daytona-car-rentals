# DCR-028 — Notification System Design

**Owner:** Claude (design)
**Implementers:** Codex — DCR-029 (email), DCR-030 (SMS)
**Status:** Complete

---

## Providers

| Channel | Provider | Rationale |
|---|---|---|
| Email | **Resend** + **React Email** | First-class Next.js support; React components for templates; generous free tier |
| SMS | **Twilio** | Industry standard; E.164 number validation; TCPA-compliant opt-out |

---

## Environment Variables

Add to `.env.local.example` and Vercel:

```
RESEND_API_KEY=
RESEND_FROM_EMAIL=Daytona Car Rentals <noreply@daytonacarrentals.com>
ADMIN_NOTIFICATION_EMAIL=ops@daytonacarrentals.com
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=+1...
CRON_SECRET=
```

---

## Notification Trigger Matrix

| Trigger | Email recipient | SMS recipient | Condition |
|---|---|---|---|
| Booking submitted | Customer | Customer | Always |
| Booking confirmed | Customer | Customer | If `smsOptIn` |
| Booking cancelled by customer | Customer | — | Always |
| Booking cancelled by admin | Customer | Customer | If `smsOptIn` |
| Payment failed | Customer | — | Always |
| Refund processed | Customer | — | Always |
| Document submitted | Admin (`ADMIN_NOTIFICATION_EMAIL`) | — | Always |
| Document approved | Customer | — | Always |
| Document rejected | Customer | — | Always |
| Pickup reminder (24h before) | Customer | Customer | If `smsOptIn` |
| Return reminder (24h before) | Customer | — | Always |

---

## Data Model Change: `smsOptIn`

Add an optional field to `UserProfile` in `types/user.ts`:

```typescript
smsOptIn?: boolean; // default: false — SMS sent only when true
```

Add the same field to `UpsertUserProfileInput`. No migration needed — Firestore omits the field for existing users, which is treated as `false`.

---

## Service Architecture

### `lib/services/notificationService.ts`

`server-only`. All functions are best-effort — they never throw. Failures are logged to `console.error` and execution continues.

#### Config error class

```typescript
export class NotificationConfigError extends Error {
  constructor(channel: "email" | "sms") {
    super(`Notification channel "${channel}" is not configured.`);
    this.name = "NotificationConfigError";
  }
}
```

#### Primitive senders

```typescript
export async function sendEmail(options: {
  to: string;
  subject: string;
  react: React.ReactElement;
}): Promise<void>

export async function sendSms(options: {
  to: string;
  body: string;
}): Promise<void>
```

Both wrap their calls in try/catch. `NotificationConfigError` (missing env vars) is silently swallowed. Other errors hit `console.error` only.

`sendEmail` uses `resend.emails.send({ from: process.env.RESEND_FROM_EMAIL, ... })`.

`sendSms` guards on `smsOptIn` at the call site, not inside this function. It normalises the phone number to E.164 before sending.

#### Event handlers

Each handler calls `sendEmail` and/or `sendSms` internally and is itself best-effort:

```typescript
export async function notifyBookingSubmitted(booking: Booking, customer: UserProfile, vehicle: Vehicle): Promise<void>
export async function notifyBookingConfirmed(booking: Booking, customer: UserProfile, vehicle: Vehicle): Promise<void>
export async function notifyBookingCancelledByCustomer(booking: Booking, customer: UserProfile, vehicle: Vehicle): Promise<void>
export async function notifyBookingCancelledByAdmin(booking: Booking, customer: UserProfile, vehicle: Vehicle): Promise<void>
export async function notifyPaymentFailed(booking: Booking, customer: UserProfile): Promise<void>
export async function notifyPaymentRefunded(booking: Booking, customer: UserProfile): Promise<void>
export async function notifyDocumentSubmitted(customer: UserProfile, docType: DocumentType): Promise<void>
export async function notifyDocumentApproved(customer: UserProfile, docType: DocumentType): Promise<void>
export async function notifyDocumentRejected(customer: UserProfile, docType: DocumentType, rejectionReason: string): Promise<void>
export async function notifyPickupReminder(booking: Booking, customer: UserProfile, vehicle: Vehicle): Promise<void>
export async function notifyReturnReminder(booking: Booking, customer: UserProfile, vehicle: Vehicle): Promise<void>
```

---

## Email Templates

Create `emails/` directory at project root. Each file exports a React Email component.

### Shared layout: `emails/BaseEmail.tsx`

Wraps all templates. Contains:
- Daytona Car Rentals logo / wordmark
- Orange brand color (`#f97316`)
- Footer: address, unsubscribe link placeholder (`{unsubscribeUrl}`), legal copy
- Max-width container, white background

### Per-event templates

| File | Subject line | Key dynamic fields |
|---|---|---|
| `emails/BookingSubmittedEmail.tsx` | "Your booking request is received" | `customerName`, `vehicleDescription`, `startDate`, `endDate`, `pickupLocation`, `depositAmount` |
| `emails/BookingConfirmedEmail.tsx` | "Your booking is confirmed — see you soon" | same + `confirmationNumber` |
| `emails/BookingCancelledEmail.tsx` | "Your booking has been cancelled" | `customerName`, `vehicleDescription`, `startDate`, `refundNote` (conditional) |
| `emails/PaymentFailedEmail.tsx` | "Action required: payment could not be processed" | `customerName`, `vehicleDescription`, link to retry |
| `emails/PaymentRefundedEmail.tsx` | "Refund on its way" | `customerName`, `refundAmount`, `last4` if available |
| `emails/DocumentSubmittedEmail.tsx` | "New document for review: {customerName}" | `customerName`, `docType`, `reviewUrl` |
| `emails/DocumentApprovedEmail.tsx` | "Document approved — you're almost ready to go" | `customerName`, `docType`, `bookingUrl` if applicable |
| `emails/DocumentRejectedEmail.tsx` | "Document needs attention" | `customerName`, `docType`, `rejectionReason`, `uploadUrl` |
| `emails/PickupReminderEmail.tsx` | "Pickup tomorrow — here are your details" | `customerName`, `vehicleDescription`, `pickupTime`, `pickupLocation`, `bookingId` |
| `emails/ReturnReminderEmail.tsx` | "Your rental return is tomorrow" | `customerName`, `vehicleDescription`, `returnLocation`, `returnDate` |

All templates use React Email primitives (`Html`, `Head`, `Body`, `Container`, `Section`, `Text`, `Button`, `Hr`, `Img`). No external CSS frameworks — inline styles only, as required for email clients.

---

## SMS Message Templates

Short, direct. Include opt-out instruction on first message and whenever required by carrier.

| Event | Message |
|---|---|
| Booking submitted | `Daytona Car Rentals: We received your booking for {vehicle} ({startDate}–{endDate}). We'll confirm once your documents are verified. Reply STOP to opt out.` |
| Booking confirmed | `Daytona Car Rentals: Your booking for {vehicle} on {startDate} is confirmed! Check your email for full details.` |
| Booking cancelled by admin | `Daytona Car Rentals: Your booking for {vehicle} on {startDate} has been cancelled. Check your email for details.` |
| Pickup reminder | `Daytona Car Rentals: Reminder — pickup tomorrow at {pickupLocation}. Bring your license and booking confirmation #{bookingId}.` |

Keep all SMS under 160 characters where possible. Split messages are allowed for pickup reminders.

---

## Pickup / Return Reminder Cron Job

### Route: `app/api/cron/booking-reminders/route.ts`

**Method:** `GET`

**Security:** Verify `Authorization: Bearer {CRON_SECRET}` header. Return 401 if missing or wrong. Register the secret in Vercel and Vercel Cron config.

**Schedule:** Daily at 10:00 UTC (`0 10 * * *`)

**Logic:**

```
tomorrowStart = start of tomorrow UTC
tomorrowEnd   = end of tomorrow UTC

pickupBookings = listDocuments("bookings", {
  filters: [
    { field: "startDate", operator: ">=", value: tomorrowStart },
    { field: "startDate", operator: "<",  value: tomorrowEnd  },
    { field: "status",    operator: "in", value: ["confirmed", "active"] },
  ]
})

returnBookings = listDocuments("bookings", {
  filters: [
    { field: "endDate", operator: ">=", value: tomorrowStart },
    { field: "endDate", operator: "<",  value: tomorrowEnd  },
    { field: "status",  operator: "==", value: "active" },
  ]
})
```

For each booking, fetch customer and vehicle, then call the appropriate notification handler. Runs serially to avoid Resend/Twilio rate limits — `for...of` with `await`, not `Promise.all`.

**`vercel.json` config:**

```json
{
  "crons": [
    {
      "path": "/api/cron/booking-reminders",
      "schedule": "0 10 * * *"
    }
  ]
}
```

**Important**: `listDocuments` currently only supports a single `orderBy` with inequality filters. The two-inequality Firestore limitation (from DCR-014) applies here: `startDate >=` and `startDate <` are on the same field, so this is fine. The `status in` filter is equality-based and doesn't count as an inequality.

---

## Integration Points

Call `void notify...(...)` after the primary write succeeds, in the same locations as audit events. Never await — fire-and-forget.

### `lib/services/bookingService.ts`

```typescript
// createBooking — after transaction + getBookingById
void notifyBookingSubmitted(booking, customer, vehicle);

// updateBookingStatus — after write, when new status === "confirmed"
if (updatedBooking.status === "confirmed") {
  void notifyBookingConfirmed(updatedBooking, customer, vehicle);
}

// cancelBooking — after write, branch on cancelledBy
if (cancelledBy === "admin") {
  void notifyBookingCancelledByAdmin(cancelledBooking, customer, vehicle);
} else {
  void notifyBookingCancelledByCustomer(cancelledBooking, customer, vehicle);
}
```

`bookingService` will need to fetch `customer` (`getUserProfile`) and `vehicle` (`getVehicleById`) for the notification calls. Both are already imported. Add fetches after the primary Firestore write, guarded with null checks before calling notify.

### `lib/stripe/webhooks.ts`

```typescript
// payment_intent.payment_failed — after syncBookingPaymentStatus
if (booking) void notifyPaymentFailed(booking, customer);

// charge.refunded — after syncBookingPaymentStatus
if (booking) void notifyPaymentRefunded(booking, customer);
```

### `lib/services/documentService.ts`

```typescript
// upsertUserDocument — after write
void notifyDocumentSubmitted(customer, input.type);

// reviewUserDocument — after write
if (input.status === "approved") {
  void notifyDocumentApproved(customer, documentType);
} else {
  void notifyDocumentRejected(customer, documentType, input.rejectionReason ?? "");
}
```

---

## Dependencies

```bash
npm install resend @react-email/components twilio
```

`react` is already installed. React Email components render server-side — no client bundle impact.

---

## Acceptance Criteria for DCR-029 (Email) and DCR-030 (SMS)

### DCR-029 — Email

- [ ] `resend` + `@react-email/components` installed
- [ ] `emails/BaseEmail.tsx` shared layout with logo, footer, unsubscribe placeholder
- [ ] All 10 email templates created in `emails/`
- [ ] `lib/services/notificationService.ts` created with `sendEmail` + all `notifyEmail*` handlers
- [ ] `smsOptIn?: boolean` added to `UserProfile` and `UpsertUserProfileInput`
- [ ] All email integration points wired with `void notify...(...)` in bookingService, webhooks, documentService
- [ ] `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `ADMIN_NOTIFICATION_EMAIL` added to `.env.local.example`
- [ ] `npm run build` passes

### DCR-030 — SMS

- [ ] `twilio` installed
- [ ] `sendSms` added to `notificationService.ts`
- [ ] SMS `notifyBookingSubmitted`, `notifyBookingConfirmed`, `notifyBookingCancelledByAdmin`, `notifyPickupReminder` implementations added
- [ ] All SMS sends guarded on `customer.smsOptIn === true`
- [ ] `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` added to `.env.local.example`
- [ ] Cron route `app/api/cron/booking-reminders/route.ts` created with `CRON_SECRET` auth
- [ ] `vercel.json` created with cron schedule
- [ ] `CRON_SECRET` added to `.env.local.example`
- [ ] `npm run build` passes

### Both tasks — shared rules

- All notification functions are best-effort: wrap in try/catch, never throw, log errors to `console.error`
- `NotificationConfigError` (missing env vars) silently swallowed — app functions normally without notification config
- No notification call is `await`ed at the call site — always `void notify...()`

---

## Out of Scope

- Notification preference centre / unsubscribe management UI (future task)
- In-app notification bell / realtime alerts (future task)
- Email open/click tracking (can be enabled in Resend dashboard without code changes)
- WhatsApp or push notifications
