import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createTestDatabase } from "./postgres-fixture";
import { query, closeDatabase } from "../lib/pilot/database";
import { dispatchNotifications } from "../lib/customer/notifications";
process.env.DCR_DEMO_MODE = "false";
process.env.DCR_EMAIL_MODE = "resend";
process.env.DCR_EMAIL_API_KEY = "synthetic-key";
process.env.DCR_EMAIL_FROM = "test@example.invalid";
let db: Awaited<ReturnType<typeof createTestDatabase>>;
const original = global.fetch;
before(async () => {
  db = await createTestDatabase(false);
  process.env.DCR_DATABASE_URL = db.url;
});
after(async () => {
  global.fetch = original;
  await closeDatabase();
  await db.cleanup();
});
async function add() {
  const id = randomUUID();
  await query(
    "INSERT INTO dcr_private.outbox(id,event_key,recipient,payload,created_at) VALUES($1,$5,$2,$3,$4)",
    [
      id,
      "synthetic@example.invalid",
      { subject: "Synthetic test", text: "No customer data" },
      Date.now(),
      id,
    ],
  );
  return id;
}
test("network failure retries with same key and payload, then stops after acknowledged send", async () => {
  const id = await add(),
    calls: { key: string; body: unknown }[] = [];
  let fail = true;
  global.fetch = async (_url, options) => {
    calls.push({
      key: (options?.headers as Record<string, string>)["Idempotency-Key"],
      body: options?.body,
    });
    if (fail) throw Error("Synthetic network failure");
    return new Response("{}", { status: 200 });
  };
  await dispatchNotifications();
  let row = (await query("SELECT * FROM dcr_private.outbox WHERE id=$1", [id]))
    .rows[0];
  assert.equal(row.state, "retry");
  assert.equal(row.attempts, 1);
  fail = false;
  await query("UPDATE dcr_private.outbox SET next_at=0 WHERE id=$1", [id]);
  await dispatchNotifications();
  await dispatchNotifications();
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0], calls[1]);
  row = (await query("SELECT * FROM dcr_private.outbox WHERE id=$1", [id]))
    .rows[0];
  assert.equal(row.state, "sent");
});
test("uncertain delivery outside provider dedupe window is blocked, even after transaction rollback", async () => {
  const id = await add();
  await query("UPDATE dcr_private.outbox SET created_at=$2 WHERE id=$1", [
    id,
    Date.now() - 24 * 3600000,
  ]);
  global.fetch = async () => {
    throw Error("Must never send outside window");
  };
  await dispatchNotifications();
  assert.equal(
    (await query("SELECT state FROM dcr_private.outbox WHERE id=$1", [id]))
      .rows[0].state,
    "blocked",
  );
});
