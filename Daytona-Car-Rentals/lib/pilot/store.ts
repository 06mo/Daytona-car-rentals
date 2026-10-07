import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
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

export class PilotError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export const isDemo = () => process.env.DCR_DEMO_MODE === "true";
let connection: DatabaseSync | undefined;
export function db() {
  if (connection) {
    const mode = connection
      .prepare("SELECT data FROM config WHERE id='environment'")
      .get();
    if (mode?.data !== (isDemo() ? "demo" : "live"))
      throw new PilotError(
        "Use a separate database for live rentals and preview data.",
        503,
      );
    return connection;
  }
  const file = resolve(process.env.DCR_DATABASE_PATH || "data/pilot.sqlite");
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  connection = new DatabaseSync(file);
  connection.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS config(id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS quotes(id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS reservations(id TEXT PRIMARY KEY, request_key TEXT UNIQUE NOT NULL, payload_hash TEXT NOT NULL, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS blocks(id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS attempts(id TEXT PRIMARY KEY, count INTEGER NOT NULL, reset INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS audit(id TEXT PRIMARY KEY, at INTEGER NOT NULL, action TEXT NOT NULL, reference TEXT NOT NULL);`);
  const demo = isDemo();
  connection
    .prepare("INSERT OR IGNORE INTO config VALUES('environment',?)")
    .run(demo ? "demo" : "live");
  if (
    connection.prepare("SELECT data FROM config WHERE id='environment'").get()
      ?.data !== (demo ? "demo" : "live")
  )
    throw new PilotError(
      "Use a separate database for live rentals and preview data.",
      503,
    );
  connection
    .prepare("INSERT OR IGNORE INTO config VALUES('settings',?)")
    .run(
      JSON.stringify({
        taxBps: demo ? 650 : 0,
        surchargeCents: 200,
        deliveryCents: demo ? 3500 : 0,
        depositCents: demo ? 30000 : 0,
        bufferMinutes: 120,
        policyApproved: false,
        agreementApproved: false,
        taxApproved: false,
        airportApproved: false,
        requestsEnabled: false,
        policyReference: "",
        agreementVersion: "",
        mileage: demo ? "150 miles per rental day (example)" : "",
        minimumAge: demo ? 25 : 0,
        revision: 1,
      } satisfies PilotSettings),
    );
  for (const v of vehicles)
    connection
      .prepare("INSERT OR IGNORE INTO config VALUES(?,?)")
      .run(
        "rate:" + v.id,
        JSON.stringify({
          vehicleId: v.id,
          dailyCents: demo
            ? v.category === "van"
              ? 9500
              : v.category === "truck"
                ? 8500
                : v.category === "suv"
                  ? 7000
                  : 5500
            : 0,
          enabled: demo && isDirectRental(v.id),
          revision: 1,
        } satisfies FleetRate),
      );
  return connection;
}
function read<T>(table: string): T[] {
  return db()
    .prepare(`SELECT data FROM ${table}`)
    .all()
    .map((row) => JSON.parse(String(row.data)) as T);
}
function config<T>(id: string): T {
  const row = db().prepare("SELECT data FROM config WHERE id=?").get(id);
  if (!row) throw new PilotError("Configuration missing.", 503);
  return JSON.parse(String(row.data));
}
export const settings = () => config<PilotSettings>("settings");
export const rates = () =>
  vehicles.map((v) => config<FleetRate>("rate:" + v.id));
export const reservations = () => read<Reservation>("reservations");
export const blocks = () => read<CalendarBlock>("blocks");
function transaction<T>(fn: () => T): T {
  db().exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db().exec("COMMIT");
    return result;
  } catch (error) {
    db().exec("ROLLBACK");
    throw error;
  }
}
function audit(action: string, reference: string) {
  db()
    .prepare("INSERT INTO audit VALUES(?,?,?,?)")
    .run(randomUUID(), Date.now(), action, reference);
}
function assertAvailable(
  trip: { vehicleId: string; startMs: number; endMs: number },
  exclude?: string,
) {
  const s = settings(),
    now = Date.now();
  const conflict = reservations().some(
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
  const blocked = blocks().some(
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
export function quote(input: unknown): Quote {
  const trip = tripSchema.parse(input);
  assertDirect(trip.vehicleId);
  const s = settings(),
    rate = config<FleetRate>("rate:" + trip.vehicleId);
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
  assertAvailable(q);
  db()
    .prepare("DELETE FROM quotes WHERE json_extract(data,'$.expiresAt') < ?")
    .run(Date.now() - 86400000);
  db().prepare("INSERT INTO quotes VALUES(?,?)").run(q.id, JSON.stringify(q));
  return q;
}
export function createRequest(input: unknown) {
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
  return transaction(() => {
    const previous = db()
      .prepare("SELECT data,payload_hash FROM reservations WHERE request_key=?")
      .get(payload.idempotencyKey);
    if (previous) {
      if (previous.payload_hash !== hash)
        throw new PilotError("This request key has already been used.", 409);
      return JSON.parse(String(previous.data)) as Reservation;
    }
    const row = db()
      .prepare("SELECT data FROM quotes WHERE id=?")
      .get(payload.quoteId);
    if (!row) throw new PilotError("Please get a new quote.", 409);
    const q: Quote = JSON.parse(String(row.data));
    assertDirect(q.vehicleId);
    const s = settings(),
      rate = config<FleetRate>("rate:" + q.vehicleId);
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
    assertAvailable(q);
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
    db()
      .prepare("INSERT INTO reservations VALUES(?,?,?,?)")
      .run(r.id, payload.idempotencyKey, hash, JSON.stringify(r));
    audit("request.created", r.id);
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
export function adminAction(input: unknown) {
  const a = adminSchema.parse(input);
  return transaction(() => {
    if (a.action === "settings") {
      const s = settings();
      if (s.revision !== a.settings.revision)
        throw new PilotError("Settings changed. Reload before saving.", 409);
      if (a.settings.requestsEnabled && !launchReady(a.settings))
        throw new PilotError(
          "Policy, agreement, taxes, minimum age, and mileage must be configured before opening requests.",
        );
      db()
        .prepare("UPDATE config SET data=? WHERE id='settings'")
        .run(JSON.stringify({ ...a.settings, revision: s.revision + 1 }));
      audit("settings.updated", "settings");
    } else if (a.action === "rate") {
      if (a.enabled) assertDirect(a.vehicleId);
      const old = config<FleetRate>("rate:" + a.vehicleId);
      if (old.revision !== a.revision)
        throw new PilotError("Rate changed. Reload before saving.", 409);
      if (a.enabled && a.dailyCents <= 0)
        throw new PilotError("An enabled car needs a positive daily rate.");
      db()
        .prepare("UPDATE config SET data=? WHERE id=?")
        .run(
          JSON.stringify({
            vehicleId: a.vehicleId,
            dailyCents: a.dailyCents,
            enabled: a.enabled,
            revision: old.revision + 1,
          }),
          "rate:" + a.vehicleId,
        );
      audit("rate.updated", a.vehicleId);
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
      if (
        reservations().some(
          (r) =>
            r.status === "confirmed" &&
            r.quote.vehicleId === a.trip.vehicleId &&
            overlaps(
              startMs,
              endMs,
              r.quote.startMs,
              r.quote.endMs,
              settings().bufferMinutes,
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
      db()
        .prepare("INSERT INTO blocks VALUES(?,?)")
        .run(b.id, JSON.stringify(b));
      audit("calendar.blocked", b.id);
    } else if (a.action === "removeBlock") {
      if (!db().prepare("SELECT id FROM blocks WHERE id=?").get(a.id))
        throw new PilotError("Block not found.", 404);
      db().prepare("DELETE FROM blocks WHERE id=?").run(a.id);
      audit("calendar.unblocked", a.id);
    } else {
      const r = reservations().find((r) => r.id === a.id);
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
            (!launchReady(settings()) ||
              (r.quote.location === "airport" && !settings().airportApproved))
          )
            throw new PilotError("Launch approvals are incomplete.", 409);
          assertAvailable(r.quote, r.id);
        }
        r.status = a.status;
      }
      r.revision++;
      db()
        .prepare("UPDATE reservations SET data=? WHERE id=?")
        .run(JSON.stringify(r), r.id);
      audit(
        a.action === "review" ? "review." + a.check : "request." + a.status,
        r.id,
      );
    }
  });
}
export function publicState() {
  const s = settings();
  return {
    demo: isDemo(),
    open: isDemo() || launchReady(s),
    airportOpen: isDemo() || s.airportApproved,
    rates: rates().map((r) => ({
      vehicleId: r.vehicleId,
      enabled: r.enabled && isDirectRental(r.vehicleId),
      dailyCents: r.dailyCents,
    })),
    minimumAge: s.minimumAge,
    mileage: s.mileage,
  };
}
export function adminState() {
  return {
    demo: isDemo(),
    settings: settings(),
    rates: rates(),
    reservations: reservations().sort((a, b) => b.createdAt - a.createdAt),
    blocks: blocks(),
    audit: db()
      .prepare(
        "SELECT at,action,reference FROM audit ORDER BY at DESC LIMIT 30",
      )
      .all(),
  };
}
