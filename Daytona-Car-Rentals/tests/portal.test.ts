import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { createTestDatabase } from "./postgres-fixture";
import { query, closeDatabase } from "../lib/pilot/database";
import {
  quote,
  createRequest,
  settings,
  adminAction,
  reservations,
} from "../lib/pilot/store";
import {
  owned,
  trips,
  saveIntake,
  uploadDocument,
  document,
  deleteDocument,
  submitIntake,
  portalReview,
  requestClaim,
  tripStatus,
  acceptAlternative,
  agreementFields,
} from "../lib/customer/portal";
import { dispatchNotifications } from "../lib/customer/notifications";
import { safeReturn } from "../lib/customer/auth";
import { checks } from "../lib/pilot/model";
process.env.DCR_DEMO_MODE = "true";
let db: Awaited<ReturnType<typeof createTestDatabase>>;
before(async () => {
  db = await createTestDatabase();
  process.env.DCR_DATABASE_URL = db.url;
});
after(async () => {
  await closeDatabase();
  await db.cleanup();
});
const a = { id: randomUUID(), email: "a@example.invalid" },
  b = { id: randomUUID(), email: "b@example.invalid" };
const base = {
  vehicleId: "corolla-3275798",
  start: "2035-01-01T10:00",
  end: "2035-01-08T10:00",
  location: "local" as const,
  period: "weekly" as const,
};
function payload(id: string) {
  return {
    quoteId: id,
    idempotencyKey: randomUUID(),
    name: "Synthetic renter",
    email: "forged@example.invalid",
    phone: "0000000000",
    website: "",
    acknowledged: true,
  };
}
let id: string;
test("authenticated request ownership, idempotency and outbox are atomic", async () => {
  const q = await quote(base),
    p = payload(q.id);
  const first = await createRequest(p, a);
  id = first.id;
  const repeat = await createRequest(p, a);
  assert.equal(repeat.id, id);
  await assert.rejects(createRequest(p, b), /key/);
  assert.equal((await trips(a)).length, 1);
  assert.equal((await trips(b)).length, 0);
  await assert.rejects(owned(id, b), /not found/);
  const n = await query("SELECT * FROM dcr_private.outbox");
  assert.equal(n.rowCount, 2);
  assert(n.rows.every((x) => x.state === "pending"));
  assert(n.rows.every((x) => !JSON.stringify(x.payload).includes("forged")));
  const another = await quote({ ...base, vehicleId: "ecosport-3580557" });
  await createRequest(payload(another.id), a);
});
test("cross-customer intake and document operations denied; malformed images never persist", async () => {
  const data = {
    legalName: "Synthetic Driver",
    birthDate: "1990-01-01",
    licenseRegion: "FL",
    licenseExpiry: "2038-01-01",
    address: "Synthetic test address only",
    confirmed: true,
  };
  await assert.rejects(saveIntake(b, id, data), /not found/);
  await saveIntake(a, id, data);
  await assert.rejects(
    uploadDocument(
      a,
      id,
      "license",
      Buffer.from("<svg>not a license</svg>").toString("base64"),
    ),
    /JPEG/,
  );
  const image = (
    await sharp({
      create: { width: 20, height: 20, channels: 3, background: "#cccccc" },
    })
      .png()
      .toBuffer()
  ).toString("base64");
  await assert.rejects(uploadDocument(b, id, "license", image), /not found/);
  const doc = await uploadDocument(a, id, "license", image);
  await assert.rejects(document(doc.id, b), /not found/);
  assert((await document(doc.id, a)).length > 20);
  await assert.rejects(deleteDocument(b, doc.id), /not found/);
  await assert.rejects(submitIntake(a, id), /all required/);
  await uploadDocument(a, id, "insurance", image);
  await submitIntake(a, id);
  const prior = (await owned(id, a)).revision;
  await submitIntake(a, id);
  assert.equal((await owned(id, a)).revision, prior);
  const r = await owned(id, a);
  assert.equal(r.reviewStage, "under_review");
  await assert.rejects(
    adminAction({
      action: "status",
      id,
      revision: r.revision,
      status: "confirmed",
    }),
    /approval/,
  );
  await portalReview(
    {
      action: "documents",
      id,
      revision: r.revision,
      reason: "Synthetic documents reviewed",
    },
    "owner:test",
  );
  const reviewed = await owned(id, a);
  await portalReview(
    {
      action: "approved",
      id,
      revision: reviewed.revision,
      reason: "Synthetic eligibility reviewed",
    },
    "owner:test",
  );
  assert.equal((await agreementFields(id, "owner:test")).quote.id, r.quote.id);
  await assert.rejects(
    adminAction({
      action: "status",
      id,
      revision: (await owned(id, a)).revision,
      status: "confirmed",
    }),
    /release check/,
  );
  for (const check of checks) {
    const current = await owned(id, a);
    await adminAction(
      {
        action: "review",
        id,
        revision: current.revision,
        check,
        checked: true,
        evidence: "Synthetic manual review evidence",
      },
      "owner:test",
    );
  }
  await adminAction(
    {
      action: "status",
      id,
      revision: (await owned(id, a)).revision,
      status: "confirmed",
    },
    "owner:test",
  );
  assert.equal(tripStatus(await owned(id, a)).label, "Confirmed");
});
test("guest claims never authorize by reference or client email; explicit audited owner association", async () => {
  const q = await quote({
    ...base,
    start: "2035-03-01T10:00",
    end: "2035-03-08T10:00",
  });
  const guest = await createRequest(payload(q.id));
  await requestClaim(a, guest.id);
  assert.equal((await query("SELECT * FROM dcr_private.claims")).rowCount, 0);
  const legacy = { id: randomUUID(), email: "preview@example.invalid" };
  await requestClaim(legacy, guest.id);
  await assert.rejects(owned(guest.id, legacy), /not found/);
  const claim = (await query("SELECT * FROM dcr_private.claims")).rows[0];
  await portalReview(
    {
      action: "claim",
      id: claim.id,
      accept: true,
      reason: "Owner checked original synthetic source",
    },
    "owner:test",
  );
  assert.equal((await owned(guest.id, legacy)).id, guest.id);
  await assert.rejects(owned(guest.id, a), /not found/);
});
test("settings changes version policy, invalidate open quotes and preserve accepted snapshots", async () => {
  const before = (await owned(id, a)).quote;
  const s = await settings();
  const q = await quote({
    ...base,
    start: "2036-01-01T10:00",
    end: "2036-01-08T10:00",
  });
  await assert.rejects(
    adminAction({
      action: "settings",
      settings: { ...s, policy: { maxDays: 31 } },
    }),
    /30/,
  );
  await adminAction(
    {
      action: "settings",
      settings: {
        ...s,
        policy: {
          weeklyCents: 30000,
          monthlyCents: 100000,
          maxDays: 30,
          mileagePerDay: 120,
          excessMileCents: 50,
        },
      },
    },
    "owner:test",
  );
  await assert.rejects(createRequest(payload(q.id), a), /settings changed/);
  assert.deepEqual((await owned(id, a)).quote, before);
  const next = await quote({
    ...base,
    start: "2036-01-01T10:00",
    end: "2036-01-08T10:00",
  });
  assert.equal(next.rentalCents, 30000);
  assert.equal(next.policy?.excessMileCents, 50);
  assert(
    (await query("SELECT * FROM dcr_private.setting_history")).rowCount! > 0,
  );
  await assert.rejects(
    quote({ ...base, start: "2036-01-01T10:00", end: "2036-02-01T10:00" }),
    /30/,
  );
});
test("alternative requires explicit customer acceptance and a valid unchanged quote", async () => {
  const q = await quote({
    ...base,
    start: "2036-03-01T10:00",
    end: "2036-03-08T10:00",
  });
  const r = await createRequest(payload(q.id), a);
  await portalReview(
    {
      action: "alternative",
      id: r.id,
      revision: r.revision,
      vehicleId: "santafe-3143340",
      reason: "Synthetic alternative offer",
    },
    "owner:test",
  );
  const offered = await owned(r.id, a);
  assert.equal(offered.quote.vehicleId, base.vehicleId);
  assert.equal(offered.reviewStage, "alternative");
  await assert.rejects(
    acceptAlternative(b, r.id, offered.revision),
    /not found/,
  );
  await acceptAlternative(a, r.id, offered.revision);
  assert.equal((await owned(r.id, a)).quote.vehicleId, "santafe-3143340");
  await assert.rejects(acceptAlternative(a, r.id, offered.revision), /changed/);
});
test("capture delivery is durable and never claims sent; repeated dispatch cannot duplicate", async () => {
  for (let n = 0; n < 20; n++) await dispatchNotifications();
  const rows = (await query("SELECT state,attempts FROM dcr_private.outbox"))
    .rows;
  assert(rows.length > 2);
  assert(rows.every((r) => r.state === "captured" && r.attempts === 1));
  await dispatchNotifications();
  assert.deepEqual(
    (await query("SELECT state,attempts FROM dcr_private.outbox")).rows,
    rows,
  );
});
test("expired document access denied and owner retention purge removes bytes", async () => {
  const doc = (await query("SELECT id FROM dcr_private.documents LIMIT 1"))
    .rows[0];
  await db.owner.query(
    "UPDATE dcr_private.documents SET expires_at=0 WHERE id=$1",
    [doc.id],
  );
  await assert.rejects(document(doc.id, a), /not found/);
  await portalReview({ action: "purge" }, "owner:test");
  assert.equal(
    (await query("SELECT id FROM dcr_private.documents WHERE id=$1", [doc.id]))
      .rowCount,
    0,
  );
});
test("safe returns retain trip fields and reject external redirects, contact fields and quotes", () => {
  assert.equal(safeReturn("//evil.example/booking"), "/my-trip");
  assert.equal(
    safeReturn(
      "/booking?vehicle=corolla-3275798&period=monthly&start=2037-01-01T10:00&email=secret&quoteId=bad",
    ),
    "/booking?vehicle=corolla-3275798&start=2037-01-01T10%3A00&period=monthly",
  );
  assert.equal(safeReturn("/\\evil.example"), "/my-trip");
});
test("private tables forbid anonymous access and runtime schema creation", async () => {
  for (const table of [
    "documents",
    "intakes",
    "claims",
    "outbox",
    "setting_history",
  ]) {
    const p = await db.owner.query(
      "SELECT has_table_privilege('anon',$1,'SELECT') ok",
      ["dcr_private." + table],
    );
    assert.equal(p.rows[0].ok, false);
  }
  await assert.rejects(
    query("CREATE TABLE dcr_private.customer_escape(id int)"),
    /permission/,
  );
});

test("replacing a license invalidates related release evidence and renter approval", async () => {
  const q = await quote({
    ...base,
    vehicleId: "focus-3139374",
    start: "2041-01-01T10:00",
    end: "2041-01-08T10:00",
  });
  const r = await createRequest(payload(q.id), a);
  for (const check of ["license", "mvr", "agreement"] as const) {
    const current = await owned(r.id, a);
    await adminAction({
      action: "review",
      id: r.id,
      revision: current.revision,
      check,
      checked: true,
      evidence: "Synthetic previous evidence",
    });
  }
  const image = (
    await sharp({
      create: { width: 20, height: 20, channels: 3, background: "#eee" },
    })
      .png()
      .toBuffer()
  ).toString("base64");
  await uploadDocument(a, r.id, "license", image);
  const changed = await owned(r.id, a);
  assert.equal(changed.reviewStage, "documents_needed");
  for (const check of ["license", "mvr", "agreement"] as const)
    assert.equal(changed.checks[check].checked, false);
});
test("monthly price is explicit for 30 days, and all operational quote terms are snapshotted", async () => {
  const q = await quote({
    ...base,
    start: "2042-01-01T10:00",
    end: "2042-01-31T10:00",
    period: "monthly",
  });
  assert.equal(q.rentalCents, 100000);
  assert.equal(q.days, 30);
  assert.equal(q.policy?.maxDays, 30);
  assert.equal(q.policy?.bufferMinutes, 120);
  assert.deepEqual(q.policy?.requiredDocuments, ["license", "insurance"]);
  assert.equal(q.policy?.depositCents, q.depositCents);
});
test("maintenance endpoint refuses missing/wrong credentials before database work", async () => {
  const { POST } = await import("../app/api/internal/maintenance/route");
  delete process.env.DCR_MAINTENANCE_TOKEN;
  assert.equal(
    (
      await POST(
        new Request("http://localhost/api/internal/maintenance", {
          method: "POST",
        }),
      )
    ).status,
    503,
  );
  process.env.DCR_MAINTENANCE_TOKEN =
    "synthetic-maintenance-token-32-characters";
  assert.equal(
    (
      await POST(
        new Request("http://localhost/api/internal/maintenance", {
          method: "POST",
          headers: { Authorization: "Bearer wrong" },
        }),
      )
    ).status,
    401,
  );
  process.env.DCR_SITE_ORIGIN = "http://localhost";
  assert.equal(
    (
      await POST(
        new Request("http://localhost/api/internal/maintenance", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + process.env.DCR_MAINTENANCE_TOKEN,
          },
        }),
      )
    ).status,
    200,
  );
  delete process.env.DCR_MAINTENANCE_TOKEN;
});
test('age eligibility uses the Eastern pickup birthday, not the next UTC day',async()=>{
 const q=await quote({...base,vehicleId:'elantra-3321200',start:'2043-01-01T23:00',end:'2043-01-04T23:00'});const r=await createRequest(payload(q.id),a);
 await saveIntake(a,r.id,{legalName:'Synthetic birthday test',birthDate:'2018-01-02',licenseRegion:'FL',licenseExpiry:'2045-01-01',address:'Synthetic address only',confirmed:true});
 await assert.rejects(portalReview({action:'documents',id:r.id,revision:(await owned(r.id,a)).revision,reason:'Synthetic age boundary review'},'owner:test'),/Age or license expiry/);
});
