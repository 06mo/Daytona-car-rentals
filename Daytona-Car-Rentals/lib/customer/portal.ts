import "server-only";
import { date, intakeSchema } from "./intake";
export { date, intakeSchema } from "./intake";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { z } from "zod";
import { query, transaction } from "../pilot/database";
import { PilotError } from "../pilot/errors";
import { emailHash, type CustomerIdentity } from "./auth";
import { notify } from "./notifications";
import { quote, settings } from "../pilot/store";
import { type Reservation, daytonaTime } from "../pilot/model";
export async function recordAudit(
  action: string,
  reference: string,
  actor: string,
  details: Record<string, unknown> = {},
) {
  await query(
    "INSERT INTO dcr_private.audit(id,at,action,reference,actor,details) VALUES($1,$2,$3,$4,$5,$6)",
    [randomUUID(), Date.now(), action, reference, actor, details],
  );
}
export async function owned(id: string, user: CustomerIdentity) {
  z.string().uuid().parse(id);
  const row = (
    await query(
      "SELECT data FROM dcr_private.reservations WHERE id=$1 AND customer_id=$2",
      [id, user.id],
    )
  ).rows[0];
  if (!row) throw new PilotError("Request not found.", 404);
  return row.data as Reservation;
}
export function tripStatus(r: Reservation) {
  if (r.status === "confirmed")
    return {
      label: "Confirmed",
      next: "Review your pickup instructions with our team.",
    };
  if (r.status === "cancelled")
    return {
      label: r.reviewStage === "declined" ? "Declined" : "Cancelled",
      next: r.decisionReason || "Browse another car or contact us.",
    };
  if (r.holdUntil <= Date.now())
    return {
      label: "Expired",
      next: "Start a new request with a fresh quote and availability check.",
    };
  const stages = {
    documents_needed: [
      "Documents needed",
      "Complete renter information and upload the required documents.",
    ],
    under_review: [
      "Under review",
      "Our team is reviewing your information. Your rental is not confirmed.",
    ],
    corrections: [
      "Corrections requested",
      r.decisionReason || "Review the requested corrections.",
    ],
    alternative: [
      "Alternative offered",
      "Review the proposed vehicle and price. Only accept if it suits you.",
    ],
    approved: [
      "Approved / action required",
      (r.decisionReason ? r.decisionReason + " " : "") +
        "Contact our team to complete agreement, payment and release checks. No payment has been taken here.",
    ],
  } as const;
  const s =
    stages[r.reviewStage as keyof typeof stages] || stages.documents_needed;
  return { label: s[0], next: s[1] };
}
export async function trips(user: CustomerIdentity) {
  return transaction(async () => {
    const rows = (
      await query(
        "SELECT data FROM dcr_private.reservations WHERE customer_id=$1 ORDER BY (data->>'createdAt')::bigint DESC",
        [user.id],
      )
    ).rows;
    const list = [];
    for (const row of rows) {
      const r = row.data as Reservation;
      const intake = (
        await query(
          "SELECT data FROM dcr_private.intakes WHERE request_id=$1",
          [r.id],
        )
      ).rows[0]?.data;
      const docs = (
        await query(
          "SELECT id,kind,created_at,expires_at,reviewed,valid_until FROM dcr_private.documents WHERE request_id=$1 AND expires_at>$2",
          [r.id, Date.now()],
        )
      ).rows;
      // Never return owner-only evidence or internal notes.
      list.push({
        id: r.id,
        quote: r.quote,
        status: tripStatus(r),
        stage: r.reviewStage,
        revision: r.revision,
        alternative: r.alternative,
        documents: docs,
        intake: intake || null,
        demo: r.demo,
      });
    }
    return list;
  });
}
export async function saveIntake(
  user: CustomerIdentity,
  id: string,
  input: unknown,
) {
  const data = intakeSchema.parse(input);
  return transaction(async () => {
    const r = await owned(id, user);
    editable(r);
    if (new Date(data.birthDate + "T12:00:00Z").getTime() >= Date.now())
      throw new PilotError("Check your date of birth.");
    if (daytonaTime(data.licenseExpiry + "T23:59") < r.quote.endMs)
      throw new PilotError(
        "Your license must remain valid through the requested trip.",
      );
    await query(
      "INSERT INTO dcr_private.intakes VALUES($1,$2) ON CONFLICT(request_id) DO UPDATE SET data=$2",
      [id, { ...data, confirmedAt: Date.now(), reviewed: false }],
    );
    for (const c of Object.values(r.checks)) {
      c.checked = false;
      c.evidence = "";
      c.checkedAt = 0;
    }
    r.reviewStage = "documents_needed";
    r.revision++;
    await persist(r);
    await recordAudit("intake.confirmed", id, user.id);
    await notify(r, "documents");
  });
}
function editable(r: Reservation) {
  if (r.status !== "pending" || r.holdUntil <= Date.now())
    throw new PilotError("This request is no longer open for changes.", 409);
}
export async function persist(r: Reservation) {
  await query("UPDATE dcr_private.reservations SET data=$1 WHERE id=$2", [
    r,
    r.id,
  ]);
}
export async function documentImage(base64: unknown) {
  const raw = z
    .string()
    .max(2800000)
    .regex(/^[A-Za-z0-9+/]*={0,2}$/)
    .parse(base64);
  const bytes = Buffer.from(raw, "base64");
  if (bytes.length < 20 || bytes.length > 2097152)
    throw new PilotError("Use a JPEG or PNG image no larger than 2 MB.");
  let content: Buffer;
  try {
    const image = sharp(bytes, { limitInputPixels: 16000000 });
    const meta = await image.metadata();
    if (!["jpeg", "png"].includes(meta.format || "") || (meta.pages || 1) > 1)
      throw Error();
    content = await image
      .rotate()
      .resize({
        width: 2400,
        height: 2400,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 90 })
      .toBuffer();
    if (content.length > 2097152) throw Error();
  } catch {
    throw new PilotError(
      "Upload a readable, single JPEG or PNG image up to 2 MB and 16 megapixels.",
    );
  }
  return content;
}
export async function uploadDocument(
  user: CustomerIdentity,
  id: string,
  kind: unknown,
  base64: unknown,
  validUntil?: unknown,
) {
  const k = z.enum(["license", "insurance"]).parse(kind);
  const valid = validUntil == null ? null : date.parse(validUntil);
  const content = await documentImage(base64);
  return transaction(async () => {
    const r = await owned(id, user);
    editable(r);
    const docId = randomUUID();
    await query(
      "INSERT INTO dcr_private.documents(id,request_id,kind,content,created_at,expires_at) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(request_id,kind) DO UPDATE SET id=$1,content=$4,created_at=$5,expires_at=$6,reviewed=false",
      [docId, id, k, content, Date.now(), r.quote.endMs + 30 * 86400000],
    );
    await query("UPDATE dcr_private.documents SET valid_until=$1 WHERE id=$2", [
      valid,
      docId,
    ]);
    for (const key of (k === "license"
      ? ["license", "mvr", "agreement"]
      : [
          "insurance",
          "protection",
          "agreement",
        ]) as (keyof Reservation["checks"])[])
      r.checks[key] = { checked: false, evidence: "", checkedAt: 0 };
    r.reviewStage = "documents_needed";
    r.revision++;
    await persist(r);
    await recordAudit("document.uploaded." + k, id, user.id);
    await notify(r, "documents");
    return { id: docId };
  });
}
export async function document(
  id: string,
  user: CustomerIdentity | null,
  actor?: string,
) {
  return transaction(async () => {
    const row = (
      await query(
        "SELECT * FROM dcr_private.documents WHERE id=$1 AND expires_at>$2",
        [z.string().uuid().parse(id), Date.now()],
      )
    ).rows[0];
    if (!row) throw new PilotError("Document not found.", 404);
    if (user) await owned(row.request_id, user);
    else if (!actor) throw new PilotError("Sign in.", 401);
    await recordAudit("document.viewed", row.request_id, user?.id || actor!);
    return row.content as Buffer;
  });
}
export async function deleteDocument(user: CustomerIdentity, id: string) {
  return transaction(async () => {
    const row = (
      await query(
        "SELECT request_id,kind FROM dcr_private.documents WHERE id=$1",
        [z.string().uuid().parse(id)],
      )
    ).rows[0];
    if (!row) throw new PilotError("Document not found.", 404);
    const r = await owned(row.request_id, user);
    await query("DELETE FROM dcr_private.documents WHERE id=$1", [id]);
    for (const key of (row.kind === "license"
      ? ["license", "mvr", "agreement"]
      : [
          "insurance",
          "protection",
          "agreement",
        ]) as (keyof Reservation["checks"])[])
      r.checks[key] = { checked: false, evidence: "", checkedAt: 0 };
    if (r.status === "pending") r.reviewStage = "documents_needed";
    r.revision++;
    await persist(r);
    await recordAudit("document.deleted", r.id, user.id);
    await notify(r, "documents");
  });
}
export async function requestClaim(user: CustomerIdentity, id: string) {
  return transaction(async () => {
    const row = (
      await query(
        "SELECT data,customer_id FROM dcr_private.reservations WHERE id=$1",
        [z.string().uuid().parse(id)],
      )
    ).rows[0];
    // Knowledge of a reference never grants access. Owner must approve one verified-email claim.
    if (
      row &&
      !row.customer_id &&
      emailHash(row.data.email) === emailHash(user.email)
    ) {
      await query(
        "INSERT INTO dcr_private.claims VALUES($1,$2,$3,$4,'pending') ON CONFLICT(request_id,customer_id) DO NOTHING",
        [randomUUID(), id, user.id, emailHash(user.email)],
      );
      await recordAudit("claim.requested", id, user.id);
    }
    return {
      message:
        "If this request can be associated with your verified email, our team will review the claim. No access has been granted.",
    };
  });
}
export async function submitIntake(user: CustomerIdentity, id: string) {
  return transaction(async () => {
    const r = await owned(id, user);
    editable(r);
    if (r.reviewStage === "under_review") return;
    const intake = (
      await query("SELECT data FROM dcr_private.intakes WHERE request_id=$1", [
        id,
      ])
    ).rows[0];
    if (!intake?.data.confirmed)
      throw new PilotError("Confirm your renter information first.");
    const required = r.quote.policy?.requiredDocuments || [
      "license",
      "insurance",
    ];
    const docs = (
      await query(
        "SELECT kind FROM dcr_private.documents WHERE request_id=$1 AND expires_at>$2",
        [id, Date.now()],
      )
    ).rows.map((x) => x.kind);
    if (required.some((k) => !docs.includes(k)))
      throw new PilotError("Upload all required documents first.");
    r.reviewStage = "under_review";
    r.revision++;
    await persist(r);
    await recordAudit("intake.submitted", id, user.id);
    await notify(r, "under_review");
  });
}
export async function acceptAlternative(
  user: CustomerIdentity,
  id: string,
  revision: number,
) {
  return transaction(async () => {
    const r = await owned(id, user);
    editable(r);
    if (
      r.revision !== revision ||
      r.reviewStage !== "alternative" ||
      !r.alternative
    )
      throw new PilotError("The offer changed. Reload your trip.", 409);
    // Requote through the authoritative path to recheck current gates, expiry and conflicts.
    const fresh = await quote({ ...r.alternative });
    if (
      fresh.totalCents !== r.alternative.totalCents ||
      fresh.depositCents !== r.alternative.depositCents ||
      fresh.settingsRevision !== r.alternative.settingsRevision ||
      fresh.rateRevision !== r.alternative.rateRevision ||
      r.alternative.expiresAt <= Date.now()
    )
      throw new PilotError(
        "Offer expired or pricing changed. Ask for a fresh offer.",
        409,
      );
    r.quote = fresh;
    r.alternative = undefined;
    r.reviewStage = "under_review";
    r.revision++;
    for (const c of Object.values(r.checks)) {
      c.checked = false;
      c.evidence = "";
      c.checkedAt = 0;
    }
    await persist(r);
    await recordAudit("alternative.accepted", id, user.id);
    await notify(r, "alternative_accepted");
  });
}
export async function portalReview(input: unknown, actor: string) {
  const a = z
    .object({
      action: z.enum([
        "corrections",
        "declined",
        "approved",
        "documents",
        "alternative",
        "claim",
        "purge",
      ]),
      id: z.string().uuid().optional(),
      revision: z.number().int().optional(),
      reason: z.string().trim().min(5).max(500).optional(),
      vehicleId: z.string().max(80).optional(),
      accept: z.boolean().optional(),
    })
    .parse(input);
  return transaction(async () => {
    if (a.action === "purge") {
      const n = await query(
        "DELETE FROM dcr_private.documents WHERE expires_at<=$1",
        [Date.now()],
      );
      await query(
        "DELETE FROM dcr_private.customer_drafts WHERE expires_at<=$1",
        [Date.now()],
      );
      await recordAudit("documents.retention-purge", String(n.rowCount), actor);
      return;
    }
    if (a.action === "claim") {
      const claim = (
        await query(
          "SELECT * FROM dcr_private.claims WHERE id=$1 AND status='pending'",
          [a.id],
        )
      ).rows[0];
      if (!claim) throw new PilotError("Claim not found.", 404);
      if (!a.reason)
        throw new PilotError("Record your association review reason.");
      if (a.accept) {
        const r = await query(
          "UPDATE dcr_private.reservations SET customer_id=$1::uuid,data=jsonb_set(data,'{customerId}',to_jsonb($1::text)) WHERE id=$2 AND customer_id IS NULL",
          [claim.customer_id, claim.request_id],
        );
        if (!r.rowCount)
          throw new PilotError("Request is already associated.", 409);
      }
      await query("UPDATE dcr_private.claims SET status=$1 WHERE id=$2", [
        a.accept ? "approved" : "declined",
        a.id,
      ]);
      await recordAudit(
        "claim." + (a.accept ? "approved" : "declined"),
        claim.request_id,
        actor,
        { reason: a.reason },
      );
      return;
    }
    const r = (
      await query("SELECT data FROM dcr_private.reservations WHERE id=$1", [
        a.id,
      ])
    ).rows[0]?.data as Reservation;
    if (!r) throw new PilotError("Request not found.", 404);
    editable(r);
    if (r.revision !== a.revision)
      throw new PilotError("Request changed. Reload first.", 409);
    if (!a.reason)
      throw new PilotError("Provide a customer-safe decision reason.");
    if (a.action === "documents" || a.action === "approved") {
      const intake = (
        await query(
          "SELECT data FROM dcr_private.intakes WHERE request_id=$1",
          [r.id],
        )
      ).rows[0]?.data;
      if (!intake?.confirmed)
        throw new PilotError("Confirmed renter information is required.");
      const birth = new Date(intake.birthDate + "T12:00:00Z"),
        at = new Date(r.quote.start.slice(0, 10) + "T12:00:00Z");
      let age = at.getUTCFullYear() - birth.getUTCFullYear();
      if (
        at.getUTCMonth() < birth.getUTCMonth() ||
        (at.getUTCMonth() === birth.getUTCMonth() &&
          at.getUTCDate() < birth.getUTCDate())
      )
        age--;
      if (
        age < r.quote.minimumAge ||
        (r.quote.policy?.maximumAge != null &&
          age > r.quote.policy.maximumAge) ||
        daytonaTime(intake.licenseExpiry + "T23:59") < r.quote.endMs
      )
        throw new PilotError(
          "Age or license expiry does not meet the quote requirements.",
        );
      const required = r.quote.policy?.requiredDocuments || [
        "license",
        "insurance",
      ];
      const docs = (
        await query(
          "SELECT kind,reviewed FROM dcr_private.documents WHERE request_id=$1 AND expires_at>$2",
          [r.id, Date.now()],
        )
      ).rows;
      if (
        required.some(
          (k) =>
            !docs.some(
              (d) => d.kind === k && (a.action === "documents" || d.reviewed),
            ),
        )
      )
        throw new PilotError("Required documents need owner review.");
      if (a.action === "documents") {
        await query(
          "UPDATE dcr_private.documents SET reviewed=true WHERE request_id=$1",
          [r.id],
        );
        await query(
          "UPDATE dcr_private.intakes SET data=jsonb_set(data,'{reviewed}','true') WHERE request_id=$1",
          [r.id],
        );
        r.reviewStage = "under_review";
      } else {
        if (!intake.reviewed)
          throw new PilotError("Review renter information first.");
        r.reviewStage = "approved";
      }
    } else if (a.action === "alternative") {
      if (a.vehicleId === r.quote.vehicleId)
        throw new PilotError("Choose a different direct vehicle.");
      r.alternative = await quote({ ...r.quote, vehicleId: a.vehicleId });
      r.reviewStage = "alternative";
    } else if (a.action === "declined") {
      r.status = "cancelled";
      r.reviewStage = "declined";
    } else r.reviewStage = "corrections";
    r.decisionReason = a.reason;
    r.revision++;
    await persist(r);
    await recordAudit("portal." + a.action, r.id, actor, { reason: a.reason });
    await notify(r, a.action);
  });
}
export async function ownerPortal() {
  return transaction(async () => ({
    intakes: (await query("SELECT request_id,data FROM dcr_private.intakes"))
      .rows,
    documents: (
      await query(
        "SELECT id,request_id,kind,reviewed,valid_until,expires_at FROM dcr_private.documents",
      )
    ).rows,
    claims: (
      await query(
        "SELECT id,request_id,customer_id,status FROM dcr_private.claims WHERE status='pending'",
      )
    ).rows,
    notifications: (
      await query(
        "SELECT id,event_key,state,attempts,payload FROM dcr_private.outbox ORDER BY created_at DESC LIMIT 50",
      )
    ).rows,
  }));
}
export async function agreementFields(id: string, actor: string) {
  return transaction(async () => {
    const r = (
      await query("SELECT data FROM dcr_private.reservations WHERE id=$1", [
        z.string().uuid().parse(id),
      ])
    ).rows[0]?.data as Reservation;
    const intake = (
      await query("SELECT data FROM dcr_private.intakes WHERE request_id=$1", [
        id,
      ])
    ).rows[0]?.data;
    if (
      !r ||
      !intake?.reviewed ||
      r.reviewStage !== "approved" ||
      !(
        r.status === "confirmed" ||
        (r.status === "pending" && r.holdUntil > Date.now())
      )
    )
      throw new PilotError(
        "Reviewed, approved records are required before mapping agreement fields.",
        409,
      );
    const documents = (
      await query(
        "SELECT kind FROM dcr_private.documents WHERE request_id=$1 AND reviewed AND expires_at>$2",
        [id, Date.now()],
      )
    ).rows;
    if (
      (r.quote.policy?.requiredDocuments || ["license", "insurance"]).some(
        (kind) => !documents.some((document) => document.kind === kind),
      )
    )
      throw new PilotError(
        "Current reviewed documents are required before generating agreement fields.",
        409,
      );
    // This is fresh field generation, never retrieval of an executed agreement.
    await recordAudit("agreement.fields", id, actor);
    return {
      requestId: id,
      legalName: intake.legalName,
      address: intake.address,
      licenseRegion: intake.licenseRegion,
      licenseExpiry: intake.licenseExpiry,
      vehicleId: r.quote.vehicleId,
      start: r.quote.start,
      end: r.quote.end,
      quote: r.quote,
      notice:
        "Field mapping only. No legal agreement has been generated or signed.",
    };
  });
}
