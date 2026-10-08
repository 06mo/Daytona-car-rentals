import { resolvePolicy, type RentalPolicy } from "./policy";
import { z } from "zod";

export const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
export const tripSchema = z.object({
  vehicleId: z.string().min(1).max(80),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  location: z.enum(["local", "airport"]),
  period: z.enum(["", "short", "weekly", "monthly"]).optional(),
});
export type TripInput = z.infer<typeof tripSchema>;
export const requestSchema = z.object({
  quoteId: z.string().uuid(),
  idempotencyKey: z.string().uuid(),
  name: z.string().trim().min(2).max(100),
  email: z.string().email().max(200),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d ()-]{7,30}$/),
  acknowledged: z.literal(true),
  website: z.string().max(0),
});
export type PilotSettings = {
  policy?: RentalPolicy;
  taxBps: number;
  surchargeCents: number;
  deliveryCents: number;
  depositCents: number;
  bufferMinutes: number;
  policyApproved: boolean;
  agreementApproved: boolean;
  taxApproved: boolean;
  airportApproved: boolean;
  requestsEnabled: boolean;
  policyReference: string;
  agreementVersion: string;
  mileage: string;
  minimumAge: number;
  revision: number;
};
export type FleetRate = {
  policy?: RentalPolicy;
  vehicleId: string;
  dailyCents: number;
  enabled: boolean;
  revision: number;
};
export type Quote = TripInput & {
  id: string;
  policy?: RentalPolicy;
  agreementVersion?: string;
  startMs: number;
  endMs: number;
  days: number;
  rentalCents: number;
  surchargeCents: number;
  deliveryCents: number;
  taxCents: number;
  totalCents: number;
  depositCents: number;
  expiresAt: number;
  settingsRevision: number;
  rateRevision: number;
  mileage: string;
  minimumAge: number;
  demo: boolean;
};
export const checks = [
  "license",
  "mvr",
  "insurance",
  "agreement",
  "payment",
  "protection",
  "channel",
] as const;
export type CheckName = (typeof checks)[number];
export type Review = { checked: boolean; evidence: string; checkedAt: number };
export type Reservation = {
  customerId?: string;
  reviewStage?:
    | "documents_needed"
    | "under_review"
    | "corrections"
    | "alternative"
    | "declined"
    | "approved";
  decisionReason?: string;
  alternative?: Quote;
  id: string;
  quote: Quote;
  name: string;
  email: string;
  phone: string;
  status: "pending" | "confirmed" | "cancelled";
  createdAt: number;
  holdUntil: number;
  checks: Record<CheckName, Review>;
  revision: number;
  demo: boolean;
};
export type CalendarBlock = TripInput & {
  id: string;
  startMs: number;
  endMs: number;
  reason: string;
};

export class TripDateError extends Error {}

// Interpret wall-clock dates in Daytona, not in the server/browser's timezone.
// Reject missing and repeated DST wall times instead of silently choosing one.
export function daytonaTime(value: string): number {
  const parts = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!parts) throw new TripDateError("Enter a valid date and time.");
  const [, y, m, d, h, minute] = parts.map(Number);
  const civil = Date.UTC(y, m - 1, d, h, minute);
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const matches = [4, 5]
    .map((offset) => civil + offset * 3600000)
    .filter((time) => formatter.format(time).replace(" ", "T") === value);
  if (matches.length !== 1)
    throw new TripDateError(
      "That local time is invalid or occurs twice during a clock change. Choose another time.",
    );
  return matches[0];
}
export function tripTimes(trip: TripInput, now = Date.now()) {
  const startMs = daytonaTime(trip.start),
    endMs = daytonaTime(trip.end);
  if (startMs < now + 2 * 3600000)
    throw new TripDateError("Please allow at least two hours before pickup.");
  if (endMs <= startMs) throw new TripDateError("Return must be after pickup.");
  const civil = (s: string) => Date.parse(s + "Z");
  const days = Math.ceil((civil(trip.end) - civil(trip.start)) / 86400000);
  if (days < 1 || days > 30)
    throw new TripDateError("Pilot rentals are limited to 1–30 rental days.");
  return { startMs, endMs, days };
}
export function calculateQuote(
  trip: TripInput,
  settings: PilotSettings,
  rate: FleetRate,
  now = Date.now(),
) {
  const times = tripTimes(trip, now);
  const policy = resolvePolicy(settings.policy, {
    ...rate.policy,
    dailyCents:
      rate.policy?.dailyCents ??
      (rate.dailyCents > 0 ? rate.dailyCents : settings.policy?.dailyCents),
  });
  if (times.days < (policy.minDays || 1) || times.days > (policy.maxDays || 30))
    throw new TripDateError(
      "These dates do not meet this car’s configured trip duration.",
    );
  const daily = policy.dailyCents ?? rate.dailyCents;
  const rentalCents =
    times.days === 30 && policy.monthlyCents != null
      ? policy.monthlyCents
      : policy.weeklyCents != null
        ? Math.floor(times.days / 7) * policy.weeklyCents +
          (times.days % 7) * daily
        : daily * times.days;
  const surchargeCents = settings.surchargeCents * Math.min(30, times.days);
  const deliveryCents =
    trip.location === "airport"
      ? (policy.deliveryCents ?? settings.deliveryCents)
      : (policy.pickupCents ?? 0);
  const taxCents = Math.round(
    ((rentalCents + surchargeCents + deliveryCents) * settings.taxBps) / 10000,
  );
  return {
    ...trip,
    ...times,
    rentalCents,
    surchargeCents,
    deliveryCents,
    taxCents,
    totalCents: rentalCents + surchargeCents + deliveryCents + taxCents,
    policy,
    agreementVersion: settings.agreementVersion,
    depositCents: policy.depositCents ?? settings.depositCents,
    expiresAt: now + 15 * 60000,
    settingsRevision: settings.revision,
    rateRevision: rate.revision,
    mileage:
      policy.mileagePerDay != null
        ? `${policy.mileagePerDay} miles per rental day`
        : settings.mileage,
    minimumAge: policy.minimumAge ?? settings.minimumAge,
  };
}
export function overlaps(
  start: number,
  end: number,
  otherStart: number,
  otherEnd: number,
  bufferMinutes = 0,
) {
  const buffer = bufferMinutes * 60000;
  return start < otherEnd + buffer && end + buffer > otherStart;
}
export function launchReady(s: PilotSettings) {
  return (
    s.requestsEnabled &&
    s.policyApproved &&
    s.agreementApproved &&
    s.taxApproved &&
    s.minimumAge >= 18 &&
    s.policyReference.length >= 5 &&
    s.agreementVersion.length >= 3 &&
    s.mileage.length >= 3
  );
}
