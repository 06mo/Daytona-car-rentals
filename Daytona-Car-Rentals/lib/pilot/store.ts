import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { vehicles } from "../data/vehicles";
import { isDirectRental } from "../data/rentalChannels";
import {
  calculateQuote,
  checks,
  daytonaTime,
  launchReady,
  overlaps,
  requestSchema,
  tripSchema,
  type CalendarBlock,
  type FleetRate,
  type PilotSettings,
  type Quote,
  type Reservation,
} from "./model";
import { z } from "zod";

export { PilotError } from "./errors";
import { PilotError } from "./errors";
import { query, transaction, isDemo } from "./database";
export { isDemo } from "./database";
async function read<T>(table: "reservations" | "blocks"): Promise<T[]> {
  return (await query(`SELECT data FROM dcr_private.${table}`)).rows.map(row => row.data as T);
}
async function config<T>(id: string): Promise<T> {
  const row = (await query("SELECT data FROM dcr_private.config WHERE id=$1", [id])).rows[0];
  if (!row) throw new PilotError("Configuration missing. Initialize the database environment.", 503);
  return row.data as T;
}
export const settings = () => config<PilotSettings>("settings");
export const rates = async () => {
  const rows = (await query("SELECT data FROM dcr_private.config WHERE id LIKE 'rate:%'")).rows;
  return vehicles.map(v => {
    const rate = rows.find(row => row.data.vehicleId === v.id)?.data as FleetRate | undefined;
    if (!rate) throw new PilotError("Vehicle rate configuration missing.", 503);
    return rate;
  });
};
export const reservations = () => read<Reservation>("reservations");
export const blocks = () => read<CalendarBlock>("blocks");
async function audit(action: string, reference: string) {
  await query("INSERT INTO dcr_private.audit VALUES($1,$2,$3,$4)", [randomUUID(), Date.now(), action, reference]);
}
async function assertAvailable(
  trip: { vehicleId: string; startMs: number; endMs: number },
  exclude?: string,
) {
  const s = await settings(),
    now = Date.now();
  const conflict = (await reservations()).some(
    (r) =>
      r.id !== exclude &&
      r.quote.vehicleId === trip.vehicleId &&
      (r.status === "confirmed" ||
        (r.status === "pending" && r.holdUntil > now)) &&
      overlaps(
        trip.startMs,
        trip.endMs,
        r.quote.startMs,
        r.quote.endMs,
        s.bufferMinutes,
      ),
  );
  const blocked = (await blocks()).some(
    (b) =>
      b.vehicleId === trip.vehicleId &&
      overlaps(trip.startMs, trip.endMs, b.startMs, b.endMs, s.bufferMinutes),
  );
  if (conflict || blocked)
    throw new PilotError(
      "This car has a reservation or calendar block for those dates. Try another car or time.",
      409,
    );
}
function assertDirect(vehicleId: string) {
  if (!isDirectRental(vehicleId)) throw new PilotError("This vehicle is Turo-only. Book through its Turo listing.", 409);
}
export async function quote(input: unknown): Promise<Quote> {
  return transaction(async () => {
  const trip = tripSchema.parse(input);
  assertDirect(trip.vehicleId);
  const s = await settings(),
    rate = await config<FleetRate>("rate:" + trip.vehicleId);
  if (
    !vehicles.some((v) => v.id === trip.vehicleId) ||
    !rate.enabled ||
    rate.dailyCents <= 0
  )
    throw new PilotError(
      "Direct rentals are not configured for this vehicle.",
      409,
    );
  if (!isDemo() && !launchReady(s))
    throw new PilotError(
      "Direct requests are not open yet. Please contact us or book on Turo.",
      503,
    );
  if (!isDemo() && trip.location === "airport" && !s.airportApproved)
    throw new PilotError(
      "Airport delivery is not open for direct rentals yet.",
      409,
    );
  const q = {
    ...calculateQuote(trip, s, rate),
    id: randomUUID(),
    demo: isDemo(),
  };
  await assertAvailable(q);
  await query("DELETE FROM dcr_private.quotes WHERE (data->>'expiresAt')::bigint < $1", [Date.now() - 86400000]);
  await query("INSERT INTO dcr_private.quotes VALUES($1,$2)", [q.id, q]);
  return q;
  });
}
export async function createRequest(input: unknown) {
  const payload = requestSchema.parse(input);
  // The demo never persists entered contact details. It stores synthetic records only.
  const customer = isDemo()
    ? {
        name: "Preview renter",
        email: "preview@example.invalid",
        phone: "0000000000",
      }
    : { name: payload.name, email: payload.email, phone: payload.phone };
  const hash = createHash("sha256")
    .update(JSON.stringify({ quoteId: payload.quoteId, ...customer }))
    .digest("hex");
  return transaction(async () => {
    const previous = (await query("SELECT data,payload_hash FROM dcr_private.reservations WHERE request_key=$1", [payload.idempotencyKey])).rows[0];
    if (previous) {
      if (previous.payload_hash !== hash)
        throw new PilotError("This request key has already been used.", 409);
      return previous.data as Reservation;
    }
    const row = (await query("SELECT data FROM dcr_private.quotes WHERE id=$1", [payload.quoteId])).rows[0];
    if (!row) throw new PilotError("Please get a new quote.", 409);
    const q: Quote = row.data;
    assertDirect(q.vehicleId);
    const s = await settings(),
      rate = await config<FleetRate>("rate:" + q.vehicleId);
    if (q.demo !== isDemo())
      throw new PilotError(
        "This quote belongs to a different environment.",
        409,
      );
    if (
      q.expiresAt <= Date.now() ||
      q.settingsRevision !== s.revision ||
      q.rateRevision !== rate.revision ||
      !rate.enabled
    )
      throw new PilotError(
        "The quote expired or settings changed. Return to Choose for a fresh total.",
        409,
      );
    if (
      !isDemo() &&
      (!launchReady(s) || (q.location === "airport" && !s.airportApproved))
    )
      throw new PilotError("Direct requests are currently closed.", 503);
    if (q.startMs < Date.now() + 2 * 3600000)
      throw new PilotError("Pickup is too soon. Choose a later time.", 409);
    await assertAvailable(q);
    const now = Date.now();
    const r: Reservation = {
      id: randomUUID(),
      quote: q,
      ...customer,
      status: "pending",
      createdAt: now,
      holdUntil: Math.min(now + 86400000, q.startMs),
      checks: Object.fromEntries(
        checks.map((key) => [
          key,
          { checked: false, evidence: "", checkedAt: 0 },
        ]),
      ) as Reservation["checks"],
      revision: 1,
      demo: isDemo(),
    };
    await query("INSERT INTO dcr_private.reservations VALUES($1,$2,$3,$4)", [r.id, payload.idempotencyKey, hash, r]);
    await audit("request.created", r.id);
    return r;
  });
}
const settingsSchema = z.object({
  taxBps: z.number().int().min(0).max(2000),
  surchargeCents: z.number().int().min(0).max(10000),
  deliveryCents: z.number().int().min(0).max(50000),
  depositCents: z.number().int().min(0).max(500000),
  bufferMinutes: z.number().int().min(0).max(1440),
  policyApproved: z.boolean(),
  agreementApproved: z.boolean(),
  taxApproved: z.boolean(),
  airportApproved: z.boolean(),
  requestsEnabled: z.boolean(),
  policyReference: z.string().max(200),
  agreementVersion: z.string().max(100),
  mileage: z.string().max(200),
  minimumAge: z.number().int().min(0).max(99),
  revision: z.number().int(),
});
const adminSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("settings"), settings: settingsSchema }),
  z.object({
    action: z.literal("rate"),
    vehicleId: z.string(),
    dailyCents: z.number().int().min(0).max(500000),
    enabled: z.boolean(),
    revision: z.number().int(),
  }),
  z.object({
    action: z.literal("block"),
    trip: tripSchema,
    reason: z.string().trim().min(5).max(200),
  }),
  z.object({ action: z.literal("removeBlock"), id: z.string().uuid() }),
  z.object({
    action: z.literal("review"),
    id: z.string().uuid(),
    revision: z.number().int(),
    check: z.enum(checks),
    checked: z.boolean(),
    evidence: z.string().trim().max(500),
  }),
  z.object({
    action: z.literal("status"),
    id: z.string().uuid(),
    revision: z.number().int(),
    status: z.enum(["confirmed", "cancelled"]),
  }),
]);
export async function adminAction(input: unknown) {
  const a = adminSchema.parse(input);
  return transaction(async () => {
    if (a.action === "settings") {
      const s = await settings();
      if (s.revision !== a.settings.revision)
        throw new PilotError("Settings changed. Reload before saving.", 409);
      if (a.settings.requestsEnabled && !launchReady(a.settings))
        throw new PilotError(
          "Policy, agreement, taxes, minimum age, and mileage must be configured before opening requests.",
        );
      await query("UPDATE dcr_private.config SET data=$1 WHERE id='settings'", [{ ...a.settings, revision: s.revision + 1 }]);
      await audit("settings.updated", "settings");
    } else if (a.action === "rate") {
      if (a.enabled) assertDirect(a.vehicleId);
      const old = await config<FleetRate>("rate:" + a.vehicleId);
      if (old.revision !== a.revision) throw new PilotError("Rate changed. Reload before saving.", 409);
      if (a.enabled && a.dailyCents <= 0) throw new PilotError("An enabled car needs a positive daily rate.");
      await query("UPDATE dcr_private.config SET data=$1 WHERE id=$2", [{vehicleId:a.vehicleId,dailyCents:a.dailyCents,enabled:a.enabled,revision:old.revision+1}, "rate:"+a.vehicleId]);
      await audit("rate.updated", a.vehicleId);
    } else if (a.action === "block") {
      if (!vehicles.some((v) => v.id === a.trip.vehicleId))
        throw new PilotError("Vehicle not found.", 404);
      const startMs = daytonaTime(a.trip.start),
        endMs = daytonaTime(a.trip.end);
      if (
        endMs <= startMs ||
        endMs <= Date.now() ||
        endMs - startMs > 366 * 86400000
      )
        throw new PilotError(
          "A block needs a valid start and future end, within one year.",
        );
      const currentSettings = await settings();
      if (
        (await reservations()).some(
          (r) =>
            r.status === "confirmed" &&
            r.quote.vehicleId === a.trip.vehicleId &&
            overlaps(
              startMs,
              endMs,
              r.quote.startMs,
              r.quote.endMs,
              currentSettings.bufferMinutes,
            ),
        )
      )
        throw new PilotError(
          "This block conflicts with a confirmed trip. Resolve the trip first.",
          409,
        );
      const b: CalendarBlock = {
        ...a.trip,
        id: randomUUID(),
        startMs,
        endMs,
        reason: a.reason,
      };
      await query("INSERT INTO dcr_private.blocks VALUES($1,$2)", [b.id,b]);
      await audit("calendar.blocked", b.id);
    } else if (a.action === "removeBlock") {
      const result = await query("DELETE FROM dcr_private.blocks WHERE id=$1 RETURNING id", [a.id]);
      if (!result.rowCount) throw new PilotError("Block not found.", 404);
      await audit("calendar.unblocked", a.id);
    } else {
      const r = (await reservations()).find(r => r.id === a.id);
      if (!r) throw new PilotError("Request not found.", 404);
      if (r.revision !== a.revision)
        throw new PilotError(
          "Someone updated this request. Reload before saving.",
          409,
        );
      if (r.status !== "pending")
        throw new PilotError(
          "Only pending requests can be reviewed or changed.",
          409,
        );
      if (a.action === "review") {
        if (a.checked && a.evidence.length < 5)
          throw new PilotError(
            "Record a provider reference or review evidence before marking this check complete.",
          );
        r.checks[a.check] = {
          checked: a.checked,
          evidence: a.evidence,
          checkedAt: Date.now(),
        };
      } else {
        if (a.status === "confirmed") {
          assertDirect(r.quote.vehicleId);
          if (r.holdUntil <= Date.now())
            throw new PilotError(
              "This request hold expired. Obtain a new quote and request.",
              409,
            );
          if (
            !checks.every(
              (c) => r.checks[c].checked && r.checks[c].evidence.length >= 5,
            )
          )
            throw new PilotError(
              "Complete every release check before confirming.",
              409,
            );
          if (Date.now() - r.checks.channel.checkedAt > 15 * 60000)
            throw new PilotError(
              "Repeat the Turo availability check; it must be within 15 minutes of confirmation.",
              409,
            );
          if (
            !isDemo() &&
            (!launchReady(await settings()) ||
              (r.quote.location === "airport" && !(await settings()).airportApproved))
          )
            throw new PilotError("Launch approvals are incomplete.", 409);
          await assertAvailable(r.quote, r.id);
        }
        r.status = a.status;
      }
      r.revision++;
      await query("UPDATE dcr_private.reservations SET data=$1 WHERE id=$2", [r,r.id]);
      await audit(
        a.action === "review" ? "review." + a.check : "request." + a.status,
        r.id,
      );
    }
  });
}
export async function publicState() {
  return transaction(async () => {
  const s = await settings();
  return {
    demo: isDemo(),
    open: isDemo() || launchReady(s),
    airportOpen: isDemo() || s.airportApproved,
    rates: (await rates()).map((r) => ({
      vehicleId: r.vehicleId,
      enabled: r.enabled && isDirectRental(r.vehicleId),
      dailyCents: r.dailyCents,
    })),
    minimumAge: s.minimumAge,
    mileage: s.mileage,
  };
  });
}
export async function adminState() {
  return transaction(async () => ({
    demo: isDemo(), settings: await settings(), rates: await rates(),
    reservations: (await reservations()).sort((a,b) => b.createdAt-a.createdAt),
    blocks: await blocks(),
    audit: (await query<{at:string;action:string;reference:string}>("SELECT at,action,reference FROM dcr_private.audit ORDER BY at DESC LIMIT 30")).rows.map(row => ({...row,at:Number(row.at)})),
  }));
}
