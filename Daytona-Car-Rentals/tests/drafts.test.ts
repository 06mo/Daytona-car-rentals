import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { createTestDatabase } from "./postgres-fixture";
import { query, closeDatabase } from "../lib/pilot/database";
import {
  saveDraft,
  loadDraft,
  uploadDraftDocument,
  removeDraftDocument,
  draftDocument,
  submitDraft,
  reuseDocument,
  returningDetails,
} from "../lib/customer/drafts";
import { quote, createRequest } from "../lib/pilot/store";
import {
  portalReview,
  uploadDocument,
  document,
  saveIntake,
} from "../lib/customer/portal";
process.env.DCR_DEMO_MODE = "true";
let db: Awaited<ReturnType<typeof createTestDatabase>>, image: string;
const a = { id: randomUUID(), email: "draft-a@example.invalid" },
  b = { id: randomUUID(), email: "draft-b@example.invalid" };
const trip = {
  vehicleId: "corolla-3275798",
  start: "2039-01-01T10:00",
  end: "2039-01-08T10:00",
  location: "local" as const,
  period: "weekly" as const,
};
const intake = {
  legalName: "Synthetic Driver",
  birthDate: "1990-01-01",
  licenseRegion: "FL",
  licenseExpiry: "2040-01-01",
  address: "123 Synthetic Street",
  confirmed: true,
};
before(async () => {
  db = await createTestDatabase();
  process.env.DCR_DATABASE_URL = db.url;
  image = (
    await sharp({
      create: { width: 20, height: 20, channels: 3, background: "#abc" },
    })
      .png()
      .toBuffer()
  ).toString("base64");
});
after(async () => {
  await closeDatabase();
  await db.cleanup();
});
async function draft() {
  return saveDraft(a, {
    id: randomUUID(),
    revision: 0,
    data: {
      trip,
      contact: { name: "Synthetic Driver", phone: "0000000000" },
      intake,
    },
  });
}
async function complete(d: Awaited<ReturnType<typeof draft>>) {
  for (const kind of ["license", "insurance"])
    d = await uploadDraftDocument(a, {
      id: d.id,
      revision: d.revision,
      kind,
      validUntil: "2040-01-01",
      content: image,
    });
  return d;
}
test("drafts create no request, hold or outbox; ownership and immutable upload revisions", async () => {
  const d = await draft();
  const next = await uploadDraftDocument(a, {
    id: d.id,
    revision: d.revision,
    kind: "license",
    validUntil: "2040-01-01",
    content: image,
  });
  for (const t of ["reservations", "outbox"])
    assert.equal(
      Number(
        (await query("SELECT count(*) FROM dcr_private." + t)).rows[0].count,
      ),
      0,
    );
  await assert.rejects(loadDraft(b, d.id), /not found/);
  await assert.rejects(removeDraftDocument(b, d.id, "license"), /not found/);
  await assert.rejects(draftDocument(b, next.documents[0].id), /not found/);
  await assert.rejects(
    uploadDraftDocument(b, {
      id: d.id,
      revision: next.revision,
      kind: "license",
      validUntil: "2040-01-01",
      content: image,
    }),
    /not found/,
  );
  await assert.rejects(
    saveDraft(b, { id: d.id, revision: next.revision, data: d.data }),
    /not found/,
  );
  await assert.rejects(
    uploadDraftDocument(a, {
      id: d.id,
      revision: next.revision,
      kind: "license",
      validUntil: "2040-01-01",
      content: "invalid",
    }),
  );
  assert.equal(
    (await loadDraft(a, d.id)).documents[0].id,
    next.documents[0].id,
  );
  const replaced = await uploadDraftDocument(a, {
    id: d.id,
    revision: next.revision,
    kind: "license",
    validUntil: "2040-01-01",
    content: image,
  });
  assert.notEqual(replaced.documents[0].id, next.documents[0].id);
  assert.equal(
    Number(
      (
        await query(
          "SELECT count(*) FROM dcr_private.draft_documents WHERE draft_id=$1",
          [d.id],
        )
      ).rows[0].count,
    ),
    2,
  );
  await removeDraftDocument(a, d.id, "license");
  assert.equal((await loadDraft(a, d.id)).documents.length, 0);
});
let submitted: any;
test("required intake, changed trip, expired quote and idempotent atomic final attachment", async () => {
  let d = await draft(),
    q = await quote(trip);
  const payload = () => ({
    draftId: d.id,
    draftRevision: d.revision,
    quoteId: q.id,
    acknowledged: true,
    website: "",
  });
  await assert.rejects(submitDraft(a, payload()), /required documents/);
  d = await complete(d);
  d = await saveDraft(a, {
    id: d.id,
    revision: d.revision,
    data: { ...d.data, intake: { ...intake, confirmed: false } },
  });
  await assert.rejects(submitDraft(a, payload()));
  d = await saveDraft(a, {
    id: d.id,
    revision: d.revision,
    data: { ...d.data, intake },
  });
  await query(
    "UPDATE dcr_private.quotes SET data=jsonb_set(data,'{expiresAt}','1') WHERE id=$1",
    [q.id],
  );
  await assert.rejects(submitDraft(a, payload()), /expired/);
  assert.equal((await loadDraft(a, d.id)).documents.length, 2);
  q = await quote({ ...trip, vehicleId: "ecosport-3580557" });
  await assert.rejects(submitDraft(a, payload()), /Trip changed/);
  q = await quote(trip);
  const [r, repeated] = await Promise.all([
    submitDraft(a, payload()),
    submitDraft(a, payload()),
  ]);
  assert.equal(r.id, repeated.id);
  submitted = r;
  assert.equal(r.reviewStage, "under_review");
  assert.equal(
    Number(
      (
        await query(
          "SELECT count(*) FROM dcr_private.documents WHERE request_id=$1",
          [r.id],
        )
      ).rows[0].count,
    ),
    2,
  );
  assert.equal(
    Number(
      (await query("SELECT count(*) FROM dcr_private.reservations")).rows[0]
        .count,
    ),
    1,
  );
  assert.equal(
    (
      await query("SELECT data FROM dcr_private.intakes WHERE request_id=$1", [
        r.id,
      ])
    ).rows[0].data.reviewed,
    false,
  );
  await assert.rejects(submitDraft(b, payload()), /not found/);
  await assert.rejects(
    removeDraftDocument(a, d.id, "license"),
    /already submitted/,
  );
});
test("returning reuse is explicit, owned, current and unreviewed for new request", async () => {
  const saved = await returningDetails(a);
  assert.equal(saved.intake.confirmed, false);
  assert.equal((await returningDetails(b)).documents.length, 0);
  let d = await draft();
  assert.equal(d.documents.length, 0);
  const source = saved.documents[0];
  await assert.rejects(
    reuseDocument(b, { id: d.id, revision: d.revision, source: source.id }),
    /not found/,
  );
  d = await reuseDocument(a, {
    id: d.id,
    revision: d.revision,
    source: source.id,
  });
  assert.equal(d.documents.length, 1);
  await query(
    "UPDATE dcr_private.documents SET valid_until='2000-01-01' WHERE id=$1",
    [source.id],
  );
  await assert.rejects(
    reuseDocument(a, { id: d.id, revision: d.revision, source: source.id }),
    /expired/,
  );
  assert(
    !(await returningDetails(a)).documents.some((x) => x.id === source.id),
  );
});
test("legacy request documents remain readable; expired drafts and historical versions purge", async () => {
  const q = await quote({
    ...trip,
    start: "2039-03-01T10:00",
    end: "2039-03-04T10:00",
  });
  const r = await createRequest(
    {
      quoteId: q.id,
      idempotencyKey: randomUUID(),
      name: "Legacy Synthetic",
      phone: "0000000000",
      email: b.email,
      website: "",
      acknowledged: true,
    },
    b,
  );
  const doc = await uploadDocument(b, r.id, "license", image, "2050-01-01");
  assert((await document(doc.id, b)).length > 0);
  await saveIntake(b, r.id, intake);
  assert.equal((await returningDetails(b)).contact.name, r.name);
  assert.equal((await returningDetails(b)).contact.phone, r.phone);
  assert.equal((await returningDetails(b)).intake.confirmed, false);
  await query(
    "UPDATE dcr_private.customer_drafts SET expires_at=1 WHERE request_id IS NULL",
  );
  const d = await draft();
  await uploadDraftDocument(a, {
    id: d.id,
    revision: d.revision,
    kind: "license",
    validUntil: "2040-01-01",
    content: image,
  });
  await query(
    "UPDATE dcr_private.customer_drafts SET expires_at=1 WHERE id=$1",
    [d.id],
  );
  await assert.rejects(loadDraft(a, d.id), /expired/);
  await portalReview({ action: "purge" }, "test:maintenance");
  assert.equal(
    Number(
      (
        await query(
          "SELECT count(*) FROM dcr_private.draft_documents WHERE draft_id=$1",
          [d.id],
        )
      ).rows[0].count,
    ),
    0,
  );
  assert((await document(doc.id, b)).length > 0);
});
test("stale edits, required document validity, limits and runtime protections", async () => {
  let d = await complete(await draft());
  const q = await quote({
    ...trip,
    start: "2040-06-01T10:00",
    end: "2040-06-08T10:00",
  });
  d = await saveDraft(a, {
    id: d.id,
    revision: d.revision,
    data: {
      ...d.data,
      trip: { ...trip, start: q.start, end: q.end },
      intake: { ...intake, licenseExpiry: "2045-01-01" },
    },
  });
  await assert.rejects(
    saveDraft(a, { id: d.id, revision: d.revision - 1, data: d.data }),
    /another tab/,
  );
  await assert.rejects(
    submitDraft(a, {
      draftId: d.id,
      draftRevision: d.revision,
      quoteId: q.id,
      acknowledged: true,
      website: "",
    }),
    /valid through/,
  );
  await assert.rejects(
    saveDraft(a, {
      id: randomUUID(),
      revision: 0,
      data: { ...d.data, trip: { ...trip, vehicleId: "not-direct" } },
    }),
  );
  await assert.rejects(
    quote({ ...trip, start: "2040-07-01T10:00", end: "2040-08-01T10:00" }),
    /30/,
  );
  for (const t of ["customer_drafts", "draft_documents"]) {
    const row = (
      await query(
        "SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE oid=$1::regclass",
        ["dcr_private." + t],
      )
    ).rows[0];
    assert(row.relrowsecurity && row.relforcerowsecurity);
    assert.equal(
      (
        await query(
          "SELECT has_table_privilege(current_user,$1,'TRUNCATE') AS allowed",
          ["dcr_private." + t],
        )
      ).rows[0].allowed,
      false,
    );
  }
});
