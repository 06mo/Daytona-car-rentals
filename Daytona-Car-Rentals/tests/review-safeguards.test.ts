import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, scryptSync } from "node:crypto";
import sharp from "sharp";
import { createTestDatabase } from "./postgres-fixture";
import { closeDatabase, query } from "../lib/pilot/database";
import { quote, createRequest, adminAction, blocks } from "../lib/pilot/store";
import { owned, saveIntake, uploadDocument, submitIntake, portalReview, tripStatus } from "../lib/customer/portal";
import { checkAdminPassword } from "../lib/pilot/http";
import { adminLoginNetwork, loginClient, loginLimitKeys, loginWindowMs } from "../lib/pilot/admin-login";
import { checks } from "../lib/pilot/model";

process.env.DCR_DEMO_MODE = "true";
let db: Awaited<ReturnType<typeof createTestDatabase>>;
let image: string;
const customer = { id: randomUUID(), email: "safeguards@example.invalid" };
before(async () => {
  db = await createTestDatabase(); process.env.DCR_DATABASE_URL = db.url;
  image = (await sharp({ create: { width: 20, height: 20, channels: 3, background: "#ddd" } }).png().toBuffer()).toString("base64");
});
after(async () => { await closeDatabase(); await db?.cleanup(); });
async function pending(month: string) {
  const q = await quote({ vehicleId: "corolla-3275798", start: `2042-${month}-01T10:00`, end: `2042-${month}-08T10:00`, location: "local" });
  const r = await createRequest({ quoteId: q.id, idempotencyKey: randomUUID(), name: "Synthetic driver", email: customer.email, phone: "0000000000", website: "", acknowledged: true }, customer);
  await saveIntake(customer, r.id, { legalName: "Synthetic Driver", birthDate: "1990-01-01", licenseRegion: "FL", licenseExpiry: "2044-01-01", address: "Synthetic test address", confirmed: true });
  for (const kind of ["license", "insurance"]) await uploadDocument(customer, r.id, kind, image, "2044-01-01");
  await submitIntake(customer, r.id);
  return r;
}
async function approve(id: string) {
  for (const action of ["documents", "approved"])
    await portalReview({ action, id, revision: (await owned(id, customer)).revision, reason: "Synthetic owner review" }, "owner:safeguards");
  for (const check of checks)
    await adminAction({ action: "review", id, revision: (await owned(id, customer)).revision, check, checked: true, evidence: "Synthetic manual evidence" }, "owner:safeguards");
}
async function confirm(id: string) {
  await adminAction({ action: "status", id, revision: (await owned(id, customer)).revision, status: "confirmed" }, "owner:safeguards");
}

test("replacement rejects missing/expired validity without overwriting saved bytes or review state", async () => {
  const r = await pending("01"); await approve(r.id);
  const prior = await owned(r.id, customer);
  const docs = (await query("SELECT id,content,valid_until,reviewed FROM dcr_private.documents WHERE request_id=$1 ORDER BY kind", [r.id])).rows;
  for (const value of [undefined, null, "2020-01-01", "2042-01-07", "2042-02-30"])
    await assert.rejects(uploadDocument(customer, r.id, "insurance", image, value), /valid through/);
  assert.deepEqual(await owned(r.id, customer), prior);
  assert.deepEqual((await query("SELECT id,content,valid_until,reviewed FROM dcr_private.documents WHERE request_id=$1 ORDER BY kind", [r.id])).rows, docs);
  await uploadDocument(customer, r.id, "insurance", image, "2042-01-08");
  const changed = await owned(r.id, customer);
  assert.equal(changed.reviewStage, "documents_needed");
  for (const c of ["insurance", "protection", "agreement"] as const) assert.equal(changed.checks[c].checked, false);
  await submitIntake(customer, r.id); await approve(r.id); await confirm(r.id);
  assert.equal((await owned(r.id, customer)).status, "confirmed");
});

test("legacy invalid records are rejected at resubmission, review, approval and final confirmation", async () => {
  const r = await pending("02");
  for (const invalid of [null, "2020-01-01", "2042-02-07"]) {
    await query("UPDATE dcr_private.documents SET valid_until=$1 WHERE request_id=$2 AND kind='insurance'", [invalid, r.id]);
    await assert.rejects(submitIntake(customer, r.id), /valid through/);
    await assert.rejects(portalReview({ action: "documents", id: r.id, revision: (await owned(r.id, customer)).revision, reason: "Synthetic review" }, "owner:test"), /valid through/);
  }
  await query("UPDATE dcr_private.documents SET valid_until='2044-01-01' WHERE request_id=$1", [r.id]);
  await portalReview({ action: "documents", id: r.id, revision: (await owned(r.id, customer)).revision, reason: "Synthetic review" }, "owner:test");
  await query("UPDATE dcr_private.documents SET valid_until=NULL WHERE request_id=$1 AND kind='insurance'", [r.id]);
  await assert.rejects(portalReview({ action: "approved", id: r.id, revision: (await owned(r.id, customer)).revision, reason: "Synthetic review" }, "owner:test"), /valid through/);
  await query("UPDATE dcr_private.documents SET valid_until='2044-01-01' WHERE request_id=$1", [r.id]);
  await approve(r.id);
  await query("UPDATE dcr_private.documents SET valid_until='2042-02-07' WHERE request_id=$1 AND kind='insurance'", [r.id]);
  await assert.rejects(confirm(r.id), /valid through/);
  assert.equal((await owned(r.id, customer)).status, "pending");
  await query("UPDATE dcr_private.documents SET valid_until='2042-02-08' WHERE request_id=$1", [r.id]);
  await confirm(r.id);
});

test("confirmed cancellation is reasoned, audited, final and releases only its own inventory", async () => {
  const r = await pending("03"); await approve(r.id); await confirm(r.id);
  const confirmed = await owned(r.id, customer);
  await assert.rejects(quote(confirmed.quote), /reservation or calendar block/);
  const action = { action: "status", id: r.id, revision: confirmed.revision, status: "cancelled" };
  await assert.rejects(adminAction(action, "owner:canceller"), /cancellation reason/);
  await assert.rejects(adminAction({ ...action, reason: "Synthetic reason", revision: action.revision - 1 }, "owner:canceller"), /Reload/);
  await adminAction({ action: "block", trip: { ...confirmed.quote, vehicleId: "ecosport-3580557" }, reason: "Independent calendar block" }, "owner:canceller");
  const priorBlocks = await blocks();
  // A confirmed trip is not subject to the old pending hold deadline.
  await query("UPDATE dcr_private.reservations SET data=jsonb_set(data,'{holdUntil}','1') WHERE id=$1", [r.id]);
  await adminAction({ ...action, reason: "Renter requested cancellation" }, "owner:canceller");
  const cancelled = await owned(r.id, customer);
  assert.equal(cancelled.status, "cancelled"); assert.equal(cancelled.holdUntil, 0);
  assert.equal(cancelled.cancellation?.previousStatus, "confirmed");
  assert.equal(cancelled.cancellation?.actor, "owner:canceller");
  assert.equal(cancelled.revision, confirmed.revision + 1);
  assert.deepEqual(cancelled.checks, confirmed.checks);
  assert.equal(tripStatus(cancelled).next, "Renter requested cancellation");
  await assert.doesNotReject(quote(confirmed.quote));
  await assert.rejects(quote({ ...confirmed.quote, vehicleId: "ecosport-3580557" }), /calendar block/);
  assert.deepEqual(await blocks(), priorBlocks);
  const audit = (await query("SELECT actor,details FROM dcr_private.audit WHERE reference=$1 AND action='request.cancelled'", [r.id])).rows;
  assert.equal(audit.length, 1); assert.equal(audit[0].actor, "owner:canceller");
  assert.equal(audit[0].details.reason, "Renter requested cancellation");
  const messages = (await query("SELECT payload FROM dcr_private.outbox WHERE event_key LIKE $1", [r.id + ":%:cancelled:%"])).rows;
  assert.equal(messages.length, 2);
  assert(messages.every(m => m.payload.text.includes("does not process a refund")));
  await assert.rejects(adminAction({ ...action, revision: cancelled.revision, reason: "Repeated cancellation" }, "owner:canceller"), /Only pending/);
  await assert.rejects(confirm(r.id), /Only pending/);
  assert.equal((await query("SELECT 1 FROM dcr_private.audit WHERE reference=$1 AND action='request.cancelled'", [r.id])).rowCount, 1);
});

test("pending cancellation stays a request cancellation and never implies a confirmed rental", async () => {
  const r = await pending("04");
  await adminAction({ action: "status", id: r.id, revision: (await owned(r.id, customer)).revision, status: "cancelled", reason: "Renter withdrew pending request" }, "owner:safeguards");
  const messages = (await query("SELECT payload FROM dcr_private.outbox WHERE event_key LIKE $1", [r.id + ":%:cancelled:%"])).rows;
  assert(messages.some(m => m.payload.subject === "Rental request cancelled"));
  assert(messages.every(m => m.payload.text.startsWith("Your rental request has been cancelled.")));
  assert.equal((await owned(r.id, customer)).cancellation?.previousStatus, "pending");
});

test("one browser cannot exhaust another browser's allowance; rotation still meets a network ceiling", async () => {
  const hash = "synthetic:" + scryptSync("correct synthetic password", "synthetic", 64).toString("hex");
  process.env.DCR_ADMIN_PASSWORD_HASH = hash;
  await query("INSERT INTO dcr_private.attempts(id,count,reset) VALUES('admin-login',999,$1)", [Date.now() + loginWindowMs]);
  const network = "test-network-a", attacker = loginClient(undefined, hash), owner = loginClient(undefined, hash);
  for (let i = 0; i < 5; i++) await assert.rejects(checkAdminPassword("wrong", network, attacker), (e: any) => e.status === 401);
  await assert.rejects(checkAdminPassword("correct synthetic password", network, attacker), (e: any) => e.status === 429);
  await assert.doesNotReject(checkAdminPassword("correct synthetic password", network, owner));
  const keys = loginLimitKeys(network, owner, hash);
  // Consume exactly the remaining network budget with rotated clients.
  const count = Number((await query("SELECT count FROM dcr_private.attempts WHERE id=$1", [keys.network])).rows[0].count);
  for (let i = count; i < 100; i++) await assert.rejects(checkAdminPassword("wrong", network, loginClient(undefined, hash)), (e: any) => e.status === 401);
  await assert.rejects(checkAdminPassword("wrong", network, loginClient(undefined, hash)), (e: any) => e.status === 429);
  await assert.doesNotReject(checkAdminPassword("correct synthetic password", "test-network-b", owner));
  await query("UPDATE dcr_private.attempts SET reset=0 WHERE id=$1 OR id=$2", [keys.network, keys.client]);
  await assert.doesNotReject(checkAdminPassword("correct synthetic password", network, owner));
  const reset = Number((await query("SELECT reset FROM dcr_private.attempts WHERE id=$1", [keys.network])).rows[0].reset);
  assert(reset > Date.now() && reset <= Date.now() + loginWindowMs);
  assert.equal(loginClient(owner, hash), owner);
  assert.notEqual(loginClient(owner.slice(0, -1) + (owner.endsWith("0") ? "1" : "0"), hash), owner);
});

test("login network identity ignores spoofable headers locally and fails closed outside supported ingress", () => {
  const env = { VERCEL: process.env.VERCEL, DCR_SITE_ORIGIN: process.env.DCR_SITE_ORIGIN };
  try {
    delete process.env.VERCEL; process.env.DCR_SITE_ORIGIN = "http://127.0.0.1:3000";
    assert.equal(adminLoginNetwork(new Request("http://127.0.0.1:3000/api/admin/session", { headers: { "x-forwarded-for": "203.0.113.1", "x-vercel-forwarded-for": "203.0.113.2" } })), "private-loopback");
    process.env.DCR_SITE_ORIGIN = "https://example.invalid";
    assert.throws(() => adminLoginNetwork(new Request("https://example.invalid/api/admin/session")), /trusted hosting/);
    process.env.VERCEL = "1";
    assert.equal(adminLoginNetwork(new Request("https://example.invalid", { headers: { "x-vercel-forwarded-for": "203.0.113.2", "x-forwarded-for": "spoofed" } })), "vercel:203.0.113.2");
    assert.throws(() => adminLoginNetwork(new Request("https://example.invalid", { headers: { "x-vercel-forwarded-for": "203.0.113.2, 203.0.113.3" } })), /Trusted login/);
  } finally { for (const [k, v] of Object.entries(env)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } }
});
