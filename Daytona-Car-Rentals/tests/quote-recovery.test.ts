import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createTestDatabase } from "./postgres-fixture";
import { query, closeDatabase } from "../lib/pilot/database";
import { quote, restoreQuote, adminAction } from "../lib/pilot/store";
import { quoteChanges } from "../lib/pilot/quote-state";
process.env.DCR_DEMO_MODE = "true";
let db: Awaited<ReturnType<typeof createTestDatabase>>;
const trip = {
  vehicleId: "corolla-3275798",
  start: "2044-10-01T10:00",
  end: "2044-10-08T10:00",
  location: "local" as const,
  period: "weekly" as const,
};
before(async () => {
  db = await createTestDatabase();
  process.env.DCR_DATABASE_URL = db.url;
});
after(async () => {
  await closeDatabase();
  await db.cleanup();
});
test("restore uses stored prices, preserves expiry, requires all matching trip fields and creates no hold", async () => {
  const q = await quote(trip);
  const r = await restoreQuote({ resumeQuoteId: q.id, trip, totalCents: 1 });
  assert.equal(r.valid, true);
  assert.deepEqual(r.quote, q);
  for (const delta of [
    { vehicleId: "santafe-3143340" },
    { start: "2044-10-02T10:00" },
    { end: "2044-10-09T10:00" },
    { location: "airport" },
    { period: "monthly" },
  ])
    await assert.rejects(
      restoreQuote({ resumeQuoteId: q.id, trip: { ...trip, ...delta } }),
      /matching/,
    );
  await assert.rejects(
    restoreQuote({ resumeQuoteId: randomUUID(), trip }),
    /matching/,
  );
  assert.equal(
    (await query("SELECT count(*)::int AS count FROM dcr_private.reservations"))
      .rows[0].count,
    0,
  );
});
test("expired quotes are only previous-price evidence, never extended or accepted", async () => {
  const q = await quote(trip);
  q.expiresAt = Date.now() - 1;
  await query("UPDATE dcr_private.quotes SET data=$1 WHERE id=$2", [q, q.id]);
  const r = await restoreQuote({ resumeQuoteId: q.id, trip });
  assert.equal(r.valid, false);
  assert.equal(r.quote.expiresAt, q.expiresAt);
  assert.match(r.reason!, /expired/);
});
test("calendar conflicts, disabled rates, changed settings and wrong demo identity cannot restore a valid quote", async () => {
  const q = await quote(trip);
  await adminAction({
    action: "block",
    trip,
    reason: "Synthetic recovery block",
  });
  assert.equal(
    (await restoreQuote({ resumeQuoteId: q.id, trip })).valid,
    false,
  );
  await query("DELETE FROM dcr_private.blocks");
  const old = (
    await query("SELECT data FROM dcr_private.config WHERE id=$1", [
      "rate:" + trip.vehicleId,
    ])
  ).rows[0].data;
  for (const delta of [{ enabled: false }, { revision: old.revision + 1 }]) {
    await query("UPDATE dcr_private.config SET data=$1 WHERE id=$2", [
      { ...old, ...delta },
      "rate:" + trip.vehicleId,
    ]);
    assert.equal(
      (await restoreQuote({ resumeQuoteId: q.id, trip })).valid,
      false,
    );
  }
  await query("UPDATE dcr_private.config SET data=$1 WHERE id=$2", [
    old,
    "rate:" + trip.vehicleId,
  ]);
  await query("UPDATE dcr_private.quotes SET data=$1 WHERE id=$2", [
    { ...q, demo: false },
    q.id,
  ]);
  assert.equal(
    (await restoreQuote({ resumeQuoteId: q.id, trip })).valid,
    false,
  );
});
test("changed breakdown and terms are exposed even when total remains the same", async () => {
  const q = await quote(trip);
  const changes = quoteChanges(q, {
    ...q,
    rentalCents: q.rentalCents + 100,
    taxCents: q.taxCents - 100,
    depositCents: q.depositCents + 200,
    mileage: "Changed synthetic mileage",
  });
  assert.equal(changes.length, 4);
  assert.ok(changes.some((c) => c.startsWith("Rental:")));
  assert.ok(changes.some((c) => c.startsWith("Separate deposit:")));
});
