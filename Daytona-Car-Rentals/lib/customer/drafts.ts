import "server-only";
import { randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import { query, transaction } from "../pilot/database";
import { PilotError } from "../pilot/errors";
import type { CustomerIdentity } from "./auth";
import { date, intakeSchema, documentImage, recordAudit } from "./portal";
import { createRequest } from "../pilot/store";
import { daytonaTime, type Quote } from "../pilot/model";
import { isDirectRental } from "../data/rentalChannels";
const lifetime = 30 * 86400000;
const tripSchema = z.object({
  vehicleId: z.string().refine(isDirectRental, "Choose a direct-request car."),
  start: z.string().max(20),
  end: z.string().max(20),
  location: z.enum(["local", "airport"]),
  period: z.enum(["", "short", "weekly", "monthly"]).default(""),
});
const partialIntake = z.object({
  legalName: z.string().max(100).optional(),
  birthDate: z.string().max(10).optional(),
  licenseRegion: z.string().max(80).optional(),
  licenseExpiry: z.string().max(10).optional(),
  address: z.string().max(300).optional(),
  confirmed: z.boolean().default(false),
});
const dataSchema = z.object({
  trip: tripSchema,
  contact: z
    .object({
      name: z.string().max(100).default(""),
      phone: z.string().max(30).default(""),
    })
    .default({ name: "", phone: "" }),
  intake: partialIntake.default({ confirmed: false }),
});
export type DraftData = z.infer<typeof dataSchema>;
export type Draft = {
  id: string;
  customer_id: string;
  data: DraftData;
  revision: number;
  created_at: number;
  expires_at: number;
  request_id: string | null;
  submitted_hash: string | null;
};
export async function ownedDraft(
  user: CustomerIdentity,
  id: string,
  editable = false,
): Promise<Draft> {
  const row = (
    await query(
      "SELECT * FROM dcr_private.customer_drafts WHERE id=$1 AND customer_id=$2 AND expires_at>$3",
      [z.string().uuid().parse(id), user.id, Date.now()],
    )
  ).rows[0] as Draft;
  if (!row) throw new PilotError("Draft not found or expired.", 404);
  if (editable && row.request_id)
    throw new PilotError(
      "This draft was already submitted. Open My trips.",
      409,
    );
  return row;
}
async function view(d: Draft) {
  return {
    ...d,
    documents: (
      await query(
        "SELECT id,kind,valid_until,created_at FROM dcr_private.draft_documents WHERE draft_id=$1 AND current ORDER BY kind",
        [d.id],
      )
    ).rows as {
      id: string;
      kind: "license" | "insurance";
      valid_until: string;
      created_at: number;
    }[],
  };
}
export async function loadDraft(user: CustomerIdentity, id: string) {
  return transaction(async () => view(await ownedDraft(user, id)));
}
export async function listDrafts(user: CustomerIdentity) {
  return transaction(
    async () =>
      (
        await query(
          "SELECT id,data,expires_at FROM dcr_private.customer_drafts WHERE customer_id=$1 AND request_id IS NULL AND expires_at>$2 ORDER BY created_at DESC",
          [user.id, Date.now()],
        )
      ).rows,
  );
}
export async function saveDraft(user: CustomerIdentity, input: unknown) {
  const a = z
    .object({
      id: z.string().uuid(),
      revision: z.number().int().nonnegative(),
      data: dataSchema,
    })
    .parse(input);
  return transaction(async () => {
    const found = (
      await query(
        "SELECT customer_id FROM dcr_private.customer_drafts WHERE id=$1",
        [a.id],
      )
    ).rows[0];
    if (found) {
      const d = await ownedDraft(user, a.id, true);
      if (d.revision !== a.revision)
        throw new PilotError(
          "Draft changed in another tab. Reload before saving.",
          409,
        );
      await query(
        "UPDATE dcr_private.customer_drafts SET data=$1,revision=revision+1 WHERE id=$2",
        [a.data, a.id],
      );
    } else {
      if (a.revision !== 0)
        throw new PilotError("Draft expired. Start a new draft.", 409);
      const count = Number(
        (
          await query(
            "SELECT count(*) FROM dcr_private.customer_drafts WHERE customer_id=$1 AND request_id IS NULL AND expires_at>$2",
            [user.id, Date.now()],
          )
        ).rows[0].count,
      );
      if (count >= 5)
        throw new PilotError(
          "You already have five saved drafts. Resume one in My trips.",
          409,
        );
      await query(
        "INSERT INTO dcr_private.customer_drafts(id,customer_id,data,created_at,expires_at) VALUES($1,$2,$3,$4,$5)",
        [a.id, user.id, a.data, Date.now(), Date.now() + lifetime],
      );
    }
    return view(await ownedDraft(user, a.id));
  });
}
export async function draftDocument(user: CustomerIdentity, id: string) {
  return transaction(async () => {
    const row = (
      await query(
        "SELECT * FROM dcr_private.draft_documents WHERE id=$1 AND current",
        [z.string().uuid().parse(id)],
      )
    ).rows[0];
    if (!row) throw new PilotError("Document not found.", 404);
    await ownedDraft(user, row.draft_id);
    await recordAudit("draft.document.viewed", row.draft_id, user.id);
    return row.content as Buffer;
  });
}
export async function uploadDraftDocument(
  user: CustomerIdentity,
  input: unknown,
) {
  const a = z
    .object({
      id: z.string().uuid(),
      revision: z.number().int(),
      kind: z.enum(["license", "insurance"]),
      validUntil: date,
      content: z.unknown(),
    })
    .parse(input);
  // Authorize before processing bytes, then recheck ownership/revision at commit.
  await ownedDraft(user, a.id, true);
  const content = await documentImage(a.content);
  return transaction(async () => {
    const d = await ownedDraft(user, a.id, true);
    if (d.revision !== a.revision)
      throw new PilotError("Draft changed. Reload before uploading.", 409);
    if (daytonaTime(a.validUntil + "T23:59") <= Date.now())
      throw new PilotError("Upload a current document.");
    // Replacement bytes never overwrite prior versions; versions share the bounded draft retention.
    const count = Number(
      (
        await query(
          "SELECT count(*) FROM dcr_private.draft_documents WHERE draft_id=$1",
          [d.id],
        )
      ).rows[0].count,
    );
    if (count >= 20)
      throw new PilotError(
        "Document version limit reached. Contact support.",
        409,
      );
    await query(
      "UPDATE dcr_private.draft_documents SET current=false WHERE draft_id=$1 AND kind=$2",
      [d.id, a.kind],
    );
    await query(
      "INSERT INTO dcr_private.draft_documents(id,draft_id,kind,content,valid_until,created_at) VALUES($1,$2,$3,$4,$5,$6)",
      [randomUUID(), d.id, a.kind, content, a.validUntil, Date.now()],
    );
    await query(
      "UPDATE dcr_private.customer_drafts SET revision=revision+1 WHERE id=$1",
      [d.id],
    );
    await recordAudit("draft.document.uploaded", d.id, user.id, {
      kind: a.kind,
    });
    return view(await ownedDraft(user, d.id));
  });
}
export async function removeDraftDocument(
  user: CustomerIdentity,
  id: string,
  kind: unknown,
) {
  return transaction(async () => {
    const d = await ownedDraft(user, id, true);
    const k = z.enum(["license", "insurance"]).parse(kind);
    // Explicit removal removes all draft-only versions of this kind.
    await query(
      "DELETE FROM dcr_private.draft_documents WHERE draft_id=$1 AND kind=$2",
      [d.id, k],
    );
    await query(
      "UPDATE dcr_private.customer_drafts SET revision=revision+1 WHERE id=$1",
      [d.id],
    );
    await recordAudit("draft.document.removed", d.id, user.id, { kind: k });
    return view(await ownedDraft(user, d.id));
  });
}
export async function returningDetails(user: CustomerIdentity) {
  return transaction(async () => {
    const last = (
      await query(
        "SELECT d.data FROM dcr_private.customer_drafts d WHERE customer_id=$1 AND expires_at>$2 ORDER BY created_at DESC LIMIT 1",
        [user.id, Date.now()],
      )
    ).rows[0];
    const prior = (
      await query(
        "SELECT i.data,r.data AS request FROM dcr_private.intakes i JOIN dcr_private.reservations r ON r.id=i.request_id WHERE r.customer_id=$1 ORDER BY (r.data->>'createdAt')::bigint DESC LIMIT 1",
        [user.id],
      )
    ).rows[0];
    const documents = (
      await query(
        `SELECT doc.id,doc.kind,doc.valid_until,doc.reviewed FROM dcr_private.documents doc JOIN dcr_private.reservations r ON r.id=doc.request_id WHERE r.customer_id=$1 AND doc.expires_at>$2 AND doc.valid_until >= $3 ORDER BY doc.created_at DESC`,
        [user.id, Date.now(), new Date().toISOString().slice(0, 10)],
      )
    ).rows;
    return {
      contact: last?.data.contact || {
        name: prior?.request?.name || "",
        phone: prior?.request?.phone || "",
      },
      intake: {
        ...(last?.data.intake || prior?.data || {}),
        confirmed: false,
        reviewed: false,
      },
      documents,
    };
  });
}
export async function reuseDocument(user: CustomerIdentity, input: unknown) {
  const a = z
    .object({
      id: z.string().uuid(),
      source: z.string().uuid(),
      revision: z.number().int(),
    })
    .parse(input);
  return transaction(async () => {
    await ownedDraft(user, a.id, true);
    const row = (
      await query(
        "SELECT doc.* FROM dcr_private.documents doc JOIN dcr_private.reservations r ON r.id=doc.request_id WHERE doc.id=$1 AND r.customer_id=$2 AND doc.expires_at>$3",
        [a.source, user.id, Date.now()],
      )
    ).rows[0];
    if (
      !row ||
      !row.valid_until ||
      daytonaTime(row.valid_until + "T23:59") <= Date.now()
    )
      throw new PilotError(
        "Saved document is unavailable or expired. Upload a current image.",
        404,
      );
    return uploadDraftDocument(user, {
      id: a.id,
      revision: a.revision,
      kind: row.kind,
      validUntil: row.valid_until,
      content: row.content.toString("base64"),
    });
  });
}
export async function submitDraft(user: CustomerIdentity, input: unknown) {
  const a = z
    .object({
      draftId: z.string().uuid(),
      draftRevision: z.number().int(),
      quoteId: z.string().uuid(),
      acknowledged: z.literal(true),
      website: z.string().max(0),
    })
    .parse(input);
  const digest = createHash("sha256").update(JSON.stringify(a)).digest("hex");
  return transaction(async () => {
    const d = await ownedDraft(user, a.draftId);
    if (d.request_id) {
      if (d.submitted_hash !== digest)
        throw new PilotError("This draft has already been submitted.", 409);
      return (
        await query(
          "SELECT data FROM dcr_private.reservations WHERE id=$1 AND customer_id=$2",
          [d.request_id, user.id],
        )
      ).rows[0].data;
    }
    if (d.revision !== a.draftRevision)
      throw new PilotError(
        "Your draft changed. Review the latest information.",
        409,
      );
    const q = (
      await query("SELECT data FROM dcr_private.quotes WHERE id=$1", [
        a.quoteId,
      ])
    ).rows[0]?.data as Quote;
    if (!q) throw new PilotError("Get a fresh quote before submitting.", 409);
    for (const k of [
      "vehicleId",
      "start",
      "end",
      "location",
      "period",
    ] as const)
      if ((q[k] || "") !== (d.data.trip[k] || ""))
        throw new PilotError(
          "Trip changed. Save the draft and accept a fresh quote.",
          409,
        );
    const intake = intakeSchema.parse(d.data.intake);
    if (
      new Date(intake.birthDate + "T12:00Z").getTime() >= Date.now() ||
      daytonaTime(intake.licenseExpiry + "T23:59") < q.endMs
    )
      throw new PilotError(
        "Check birth date and license validity through the trip.",
      );
    const born = new Date(intake.birthDate + "T12:00Z"),
      start = new Date(q.start.slice(0, 10) + "T12:00Z");
    let age = start.getUTCFullYear() - born.getUTCFullYear();
    if (
      start.getUTCMonth() < born.getUTCMonth() ||
      (start.getUTCMonth() === born.getUTCMonth() &&
        start.getUTCDate() < born.getUTCDate())
    )
      age--;
    if (
      age < q.minimumAge ||
      (q.policy?.maximumAge != null && age > q.policy.maximumAge)
    )
      throw new PilotError(
        "Driver age does not meet this trip’s configured requirements.",
      );
    const docs = (
      await query(
        "SELECT * FROM dcr_private.draft_documents WHERE draft_id=$1 AND current",
        [d.id],
      )
    ).rows;
    for (const kind of q.policy?.requiredDocuments || ["license", "insurance"])
      if (
        !docs.some(
          (doc) =>
            doc.kind === kind &&
            daytonaTime(doc.valid_until + "T23:59") >= q.endMs,
        )
      )
        throw new PilotError(
          "Upload required documents valid through your return date.",
        );
    const r = await createRequest(
      {
        ...d.data.contact,
        email: user.email,
        quoteId: q.id,
        idempotencyKey: d.id,
        acknowledged: true,
        website: "",
      },
      user,
    );
    await query("INSERT INTO dcr_private.intakes VALUES($1,$2)", [
      r.id,
      { ...intake, confirmedAt: Date.now(), reviewed: false },
    ]);
    for (const doc of docs)
      await query(
        "INSERT INTO dcr_private.documents(id,request_id,kind,content,created_at,expires_at,valid_until) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [
          randomUUID(),
          r.id,
          doc.kind,
          doc.content,
          Date.now(),
          q.endMs + lifetime,
          doc.valid_until,
        ],
      );
    r.reviewStage = "under_review";
    await query("UPDATE dcr_private.reservations SET data=$1 WHERE id=$2", [
      r,
      r.id,
    ]);
    await query(
      "UPDATE dcr_private.customer_drafts SET request_id=$1,submitted_hash=$2,expires_at=$3 WHERE id=$4",
      [r.id, digest, q.endMs + lifetime, d.id],
    );
    await recordAudit("draft.submitted", r.id, user.id);
    return r;
  });
}
