import test, { before, after } from "node:test";
import { createTestDatabase } from "./postgres-fixture";
import { query, closeDatabase } from "../lib/pilot/database";
let fixture: Awaited<ReturnType<typeof createTestDatabase>>;
before(async () => { fixture = await createTestDatabase(true); process.env.DCR_DATABASE_URL = fixture.url; });
after(async () => { await closeDatabase(); await fixture?.cleanup(); });
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { daytonaTime, overlaps, calculateQuote, type TripInput, } from "../lib/pilot/model";
process.env.DCR_DEMO_MODE = "true";
import * as store from "../lib/pilot/store";
const trip: TripInput = {
    vehicleId: "corolla-3275798",
    start: "2030-05-01T10:00",
    end: "2030-05-04T10:00",
    location: "local",
};
const payload = (quoteId: string) => ({
    quoteId,
    idempotencyKey: randomUUID(),
    name: "Real name must not persist",
    email: "private@example.com",
    phone: "3865550000",
    acknowledged: true,
    website: "",
});
test("Daytona clock conversion rejects missing, repeated and impossible dates", async () => {
    assert.equal(daytonaTime("2027-01-10T10:00"), Date.parse("2027-01-10T15:00Z"));
    assert.equal(daytonaTime("2027-07-10T10:00"), Date.parse("2027-07-10T14:00Z"));
    assert.throws(() => daytonaTime("2027-03-14T02:30"));
    assert.throws(() => daytonaTime("2027-11-07T01:30"));
    assert.throws(() => daytonaTime("2027-02-30T10:00"));
});
test("civil rental days, surcharge and cents rounding stay correct across DST", async () => {
    const q = calculateQuote({
        ...trip,
        start: "2027-03-13T10:00",
        end: "2027-03-15T10:00",
        location: "airport",
    }, (await store.settings()), (await store.rates()).find((r) => r.vehicleId === trip.vehicleId)!, Date.parse("2027-01-01"));
    assert.equal(q.days, 2);
    assert.equal(q.endMs - q.startMs, 47 * 3600000);
    assert.equal(q.surchargeCents, 400);
    assert.equal(q.totalCents, q.rentalCents + q.deliveryCents + q.surchargeCents + q.taxCents);
    assert.equal(q.depositCents, 30000);
});
test("turnaround buffer applies on both sides with exact boundary allowed", async () => {
    assert.equal(overlaps(0, 60 * 60000, 180 * 60000, 240 * 60000, 120), false);
    assert.equal(overlaps(0, 60 * 60000, 179 * 60000, 240 * 60000, 120), true);
    assert.equal(overlaps(179 * 60000, 240 * 60000, 0, 60 * 60000, 120), true);
});
test("requests use stored quote totals, replay safely, discard demo PII and prevent overlaps", async () => {
    const first = (await store.quote(trip)), second = (await store.quote(trip));
    const p = payload(first.id);
    const r = (await store.createRequest({ ...p, totalCents: 1 }));
    assert.equal(r.quote.totalCents, first.totalCents);
    assert.equal(r.name, "Preview renter");
    assert.equal(r.email, "preview@example.invalid");
    assert.equal((await store.createRequest(p)).id, r.id);
    await assert.rejects(async () => (await store.createRequest({ ...p, quoteId: second.id })), /already been used/);
    await assert.rejects(async () => (await store.createRequest(payload(second.id))), /reservation or calendar block/);
    await assert.rejects(async () => (await store.adminAction({
        action: "status",
        id: r.id,
        revision: r.revision,
        status: "confirmed",
    })), /every release check/);
    await assert.rejects(async () => (await store.adminAction({
        action: "review",
        id: r.id,
        revision: r.revision,
        check: "mvr",
        checked: true,
        evidence: "",
    })), /evidence/);
    (await store.adminAction({
        action: "status",
        id: r.id,
        revision: r.revision,
        status: "cancelled",
    }));
    await assert.doesNotReject(async () => (await store.quote(trip)));
});
test("stale rates invalidate quotes but don't rewrite submitted snapshots", async () => {
    const q = (await store.quote({
        ...trip,
        start: "2030-06-01T10:00",
        end: "2030-06-04T10:00",
    }));
    const rate = (await store.rates()).find((r) => r.vehicleId === trip.vehicleId)!;
    (await store.adminAction({ action: "rate", ...rate, dailyCents: 9900 }));
    await assert.rejects(async () => (await store.createRequest(payload(q.id))), /expired or settings changed/);
    const accepted = (await store.createRequest(payload((await store.quote({
        ...trip,
        start: "2030-06-01T10:00",
        end: "2030-06-04T10:00",
    })).id)));
    const total = accepted.quote.totalCents;
    (await store.adminAction({ action: "rate", ...(await store.rates()).find((r) => r.vehicleId === trip.vehicleId)!, dailyCents: 12500 }));
    assert.equal((await store.reservations()).find((r) => r.id === accepted.id)?.quote.totalCents, total);
});
test("external blocks reject quotes and can include an ongoing maintenance period", async () => {
    await assert.rejects(async () => (await store.adminAction({
        action: "block",
        trip: { ...trip, start: "2020-01-01T10:00", end: "2020-01-02T10:00" },
        reason: "Expired block",
    })), /future end/);
    const blocked = {
        ...trip,
        start: "2030-07-01T10:00",
        end: "2030-07-04T10:00",
    };
    (await store.adminAction({
        action: "block",
        trip: blocked,
        reason: "Turo trip reference 123",
    }));
    await assert.rejects(async () => (await store.quote(blocked)), /calendar block/);
    const format = (time: number) => new Intl.DateTimeFormat("sv-SE", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    })
        .format(time)
        .replace(" ", "T");
    await assert.doesNotReject(async () => (await store.adminAction({
        action: "block",
        trip: {
            ...trip,
            start: format(Date.now() - 86400000),
            end: format(Date.now() + 86400000),
        },
        reason: "Ongoing maintenance",
    })));
});
test("confirmation needs fresh channel evidence, immutable review revisions and all seven checks", async () => {
    const r = (await store.createRequest(payload((await store.quote({
        ...trip,
        start: "2030-08-01T10:00",
        end: "2030-08-04T10:00",
    })).id)));
    for (const check of [
        "license",
        "mvr",
        "insurance",
        "agreement",
        "payment",
        "protection",
        "channel",
    ]) {
        const current = (await store.reservations()).find((x) => x.id === r.id)!;
        (await store.adminAction({
            action: "review",
            id: r.id,
            revision: current.revision,
            check,
            checked: true,
            evidence: "Reviewed provider record 12345",
        }));
    }
    await assert.rejects(async () => (await store.adminAction({
        action: "status",
        id: r.id,
        revision: r.revision,
        status: "confirmed",
    })), /Someone updated/);
    const stale = (await store.reservations()).find((x) => x.id === r.id)!;
    stale.checks.channel.checkedAt = Date.now() - 16 * 60000;
    (await query("UPDATE dcr_private.reservations SET data=$1 WHERE id=$2", [stale, r.id]));
    await assert.rejects(async () => (await store.adminAction({
        action: "status",
        id: r.id,
        revision: stale.revision,
        status: "confirmed",
    })), /Repeat the Turo/);
    (await store.adminAction({
        action: "review",
        id: r.id,
        revision: stale.revision,
        check: "channel",
        checked: true,
        evidence: "Calendar checked and vehicle blocked on Turo",
    }));
    const fresh = (await store.reservations()).find((x) => x.id === r.id)!;
    (await store.adminAction({
        action: "status",
        id: r.id,
        revision: fresh.revision,
        status: "confirmed",
    }));
    assert.equal((await store.reservations()).find((x) => x.id === r.id)?.status, "confirmed");
    await assert.rejects(async () => (await store.quote({
        ...trip,
        start: "2030-08-01T10:00",
        end: "2030-08-04T10:00",
    })), /reservation/);
});
test("expired quotes cannot become reservations", async () => {
    const q = (await store.quote({
        ...trip,
        start: "2030-09-01T10:00",
        end: "2030-09-04T10:00",
    }));
    q.expiresAt = Date.now() - 1;
    (await query("UPDATE dcr_private.quotes SET data=$1 WHERE id=$2", [q, q.id]));
    await assert.rejects(async () => (await store.createRequest(payload(q.id))), /expired/);
});
test("demo data cannot be reused as live inventory", async () => {
    process.env.DCR_DEMO_MODE = "false";
    await assert.rejects(async () => (await store.publicState()), /separate database/);
    process.env.DCR_DEMO_MODE = "true";
});
test("exactly five direct vehicles; Turo-only quote, saved-quote request and admin enablement are rejected", async () => {
    const { vehicles } = await import("../lib/data/vehicles");
    const { isDirectRental, directVehicles } = await import("../lib/data/rentalChannels");
    assert.deepEqual(directVehicles.map((v) => `${v.year} ${v.make} ${v.model}`), ["2020 Toyota Corolla", "2018 Hyundai Santa Fe Sport", "2018 Ford EcoSport", "2016 Hyundai Elantra", "2016 Ford Focus"]);
    const turo = vehicles.filter((v) => !isDirectRental(v.id));
    assert.equal(turo.length, 7);
    for (const v of turo) {
        await assert.rejects(async () => (await store.quote({ ...trip, vehicleId: v.id })), /Turo-only/);
        const rate = (await store.rates()).find((r) => r.vehicleId === v.id)!;
        await assert.rejects(async () => (await store.adminAction({ action: "rate", ...rate, enabled: true })), /Turo-only/);
        // Represents a quote saved by the previous all-direct pilot version.
        const q = (await store.quote({ ...trip, start: "2031-05-01T10:00", end: "2031-05-04T10:00" }));
        q.vehicleId = v.id;
        (await query("UPDATE dcr_private.quotes SET data=$1 WHERE id=$2", [q, q.id]));
        await assert.rejects(async () => (await store.createRequest(payload(q.id))), /Turo-only/);
    }
});
test("monthly remains one term of at most 30 civil days and preserves preference in the stored request", async () => {
    const start = "2031-01-01T10:00";
    const q = (await store.quote({ ...trip, start, end: "2031-01-31T10:00", period: "monthly" }));
    assert.equal(q.days, 30);
    await assert.rejects(async () => (await store.quote({ ...trip, start, end: "2031-01-31T10:01" })), /1–30/);
    await assert.rejects(async () => (await store.quote({ ...trip, start, end: "2031-02-01T10:00" })), /1–30/);
    const request = (await store.createRequest(payload(q.id)));
    assert.equal(request.quote.period, "monthly");
    assert.equal(request.status, "pending");
});
test("optional browse dates allow an empty plan but reject partial, invalid, reversed and over-limit terms", async () => {
    const { validateJourneyDates } = await import("../lib/data/journey");
    assert.equal(validateJourneyDates("", ""), "");
    assert.match(validateJourneyDates("2035-01-01T10:00", ""), /both/);
    assert.match(validateJourneyDates("2035-02-30T10:00", "2035-03-01T10:00"), /valid Eastern/);
    assert.match(validateJourneyDates("2035-01-02T10:00", "2035-01-01T10:00"), /after/);
    assert.match(validateJourneyDates("2035-01-01T10:00", "2035-01-31T10:01"), /30 days/);
    assert.equal(validateJourneyDates("2035-01-01T10:00", "2035-01-31T10:00"), "");
});
