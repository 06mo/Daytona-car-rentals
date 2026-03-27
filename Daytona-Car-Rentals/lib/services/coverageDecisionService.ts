import "server-only";

import type { EmbeddedPolicyBindResult } from "@/lib/insurance/providers/types";
import { addDocument, FirebaseConfigError, listDocuments, updateDocument } from "@/lib/firebase/firestore";
import { evaluateCoverageDecision } from "@/lib/insurance/evaluateCoverage";
import { getEmbeddedInsuranceProvider } from "@/lib/insurance/providers/embedded";
import { logAuditEvent } from "@/lib/services/auditService";
import { listPartners } from "@/lib/services/partnerService";
import { getUserDocument } from "@/lib/services/documentService";
import { getBookingById } from "@/lib/services/bookingService";
import type { Booking, CoverageDecision, CoverageSource, InsuranceVerification, PolicyEvent } from "@/types";

function getCoverageDecisionCollectionPath() {
  return "coverage_decisions";
}

function getInsuranceVerificationCollectionPath() {
  return "insurance_verifications";
}

function getPolicyEventCollectionPath() {
  return "policy_events";
}

async function getPartnerForBooking(booking: Booking) {
  if (!booking.partnerId) {
    return null;
  }

  const partners = await listPartners();
  return partners.find((partner) => partner.id === booking.partnerId) ?? null;
}

async function getLatestInsuranceVerificationForBooking(bookingId: string) {
  try {
    const records = await listDocuments<InsuranceVerification>(getInsuranceVerificationCollectionPath(), {
      filters: [{ field: "bookingId", operator: "==", value: bookingId }],
      orderBy: [{ field: "createdAt", direction: "desc" }],
      limit: 1,
    });

    return records[0] ?? null;
  } catch (error) {
    if (error instanceof FirebaseConfigError) {
      return null;
    }

    throw error;
  }
}

async function buildFallbackVerification(booking: Booking): Promise<InsuranceVerification | null> {
  if (booking.rentalChannel && booking.rentalChannel !== "direct") {
    return null;
  }

  const insuranceDocument = await getUserDocument(booking.userId, "insurance_card");
  const now = new Date();

  if (!insuranceDocument) {
    return {
      id: `fallback-${booking.id}`,
      bookingId: booking.id,
      userId: booking.userId,
      vehicleId: booking.vehicleId,
      rentalChannel: booking.rentalChannel ?? "direct",
      protectionPackage: booking.protectionPackage,
      status: "unsubmitted",
      blockingReasons: ["no_document_on_file"],
      verifiedBy: "system",
      createdAt: now,
      updatedAt: now,
    };
  }

  if (insuranceDocument.status === "rejected") {
    return {
      id: `fallback-${booking.id}`,
      bookingId: booking.id,
      userId: booking.userId,
      vehicleId: booking.vehicleId,
      rentalChannel: booking.rentalChannel ?? "direct",
      protectionPackage: booking.protectionPackage,
      status: "rejected",
      blockingReasons: ["admin_rejected"],
      verifiedBy: "system",
      documentId: insuranceDocument.id,
      createdAt: insuranceDocument.uploadedAt,
      updatedAt: insuranceDocument.reviewedAt ?? insuranceDocument.uploadedAt,
      resolvedAt: insuranceDocument.reviewedAt,
    };
  }

  return {
    id: `fallback-${booking.id}`,
    bookingId: booking.id,
    userId: booking.userId,
    vehicleId: booking.vehicleId,
    rentalChannel: booking.rentalChannel ?? "direct",
    protectionPackage: booking.protectionPackage,
    status: "pending",
    blockingReasons: ["manual_review_required"],
    verifiedBy: "system",
    documentId: insuranceDocument.id,
    createdAt: insuranceDocument.uploadedAt,
    updatedAt: insuranceDocument.reviewedAt ?? insuranceDocument.uploadedAt,
  };
}

async function persistPolicyEvent(input: Omit<PolicyEvent, "id">) {
  const id = await addDocument(getPolicyEventCollectionPath(), input);
  return { id, ...input };
}

async function getEmbeddedPolicyResult(booking: Booking, verification: InsuranceVerification | null): Promise<EmbeddedPolicyBindResult | null> {
  if ((booking.rentalChannel ?? "direct") !== "direct") {
    return null;
  }

  if (booking.protectionPackage === "basic") {
    return null;
  }

  if (verification?.status === "verified") {
    return null;
  }

  const provider = getEmbeddedInsuranceProvider();

  const quote = await provider.getQuote({
    bookingId: booking.id,
    userId: booking.userId,
    vehicleId: booking.vehicleId,
    protectionPackage: booking.protectionPackage,
    startDate: booking.startDate,
    endDate: booking.endDate,
    riskLevel: booking.riskLevel,
  });

  await persistPolicyEvent({
    bookingId: booking.id,
    userId: booking.userId,
    type: "verification_initiated",
    status: quote.status === "quoted" ? "succeeded" : "failed",
    coverageSource: "embedded_policy",
    providerId: quote.providerId,
    providerReferenceId: quote.providerReferenceId,
    errorMessage: quote.errorMessage,
    createdAt: new Date(),
  });

  if (quote.status !== "quoted") {
    return {
      status: quote.status === "manual_review" ? "manual_review" : "failed",
      providerId: quote.providerId,
      providerReferenceId: quote.providerReferenceId,
      blockingReasons: quote.blockingReasons,
      approvalReasons: quote.approvalReasons,
      errorMessage: quote.errorMessage,
      rawPayload: quote.rawPayload,
    };
  }

  const bindResult = await provider.bindPolicy({
    bookingId: booking.id,
    userId: booking.userId,
    vehicleId: booking.vehicleId,
    protectionPackage: booking.protectionPackage,
    startDate: booking.startDate,
    endDate: booking.endDate,
    riskLevel: booking.riskLevel,
    quoteReferenceId: quote.providerReferenceId,
  });

  await persistPolicyEvent({
    bookingId: booking.id,
    userId: booking.userId,
    type: bindResult.status === "bound" ? "policy_bound" : "policy_bind_failed",
    status: bindResult.status === "bound" ? "succeeded" : "failed",
    coverageSource: "embedded_policy",
    providerId: bindResult.providerId,
    providerReferenceId: bindResult.providerReferenceId,
    errorMessage: bindResult.errorMessage,
    createdAt: new Date(),
  });

  return bindResult;
}

export async function getLatestCoverageDecisionForBooking(bookingId: string) {
  try {
    const decisions = await listDocuments<CoverageDecision>(getCoverageDecisionCollectionPath(), {
      filters: [{ field: "bookingId", operator: "==", value: bookingId }],
      orderBy: [{ field: "evaluatedAt", direction: "desc" }],
      limit: 1,
    });

    return decisions[0] ?? null;
  } catch (error) {
    if (error instanceof FirebaseConfigError) {
      return null;
    }

    throw error;
  }
}

export async function persistCoverageDecision(input: Omit<CoverageDecision, "id">) {
  const id = await addDocument(getCoverageDecisionCollectionPath(), input);
  return { id, ...input };
}

export async function evaluateCoverageDecisionForBooking(bookingId: string) {
  const booking = await getBookingById(bookingId);

  if (!booking) {
    throw new Error("Booking not found.");
  }

  const [verificationRecord, partner] = await Promise.all([
    getLatestInsuranceVerificationForBooking(booking.id),
    getPartnerForBooking(booking),
  ]);
  const verification = verificationRecord ?? (await buildFallbackVerification(booking));
  const embeddedPolicyResult = await getEmbeddedPolicyResult(booking, verification);
  const now = new Date();
  const evaluation = evaluateCoverageDecision({
    bookingId: booking.id,
    userId: booking.userId,
    vehicleId: booking.vehicleId,
    rentalChannel: booking.rentalChannel ?? "direct",
    protectionPackage: booking.protectionPackage,
    startDate: booking.startDate,
    endDate: booking.endDate,
    riskLevel: booking.riskLevel,
    partner,
    platformTripId: booking.platformTripId,
    verification,
    embeddedPolicyResult,
  });

  const decision = await persistCoverageDecision({
    bookingId: booking.id,
    userId: booking.userId,
    rentalChannel: booking.rentalChannel ?? "direct",
    protectionPackage: booking.protectionPackage,
    riskLevel: booking.riskLevel,
    status: evaluation.status,
    coverageSource: evaluation.coverageSource,
    blockingReasons: evaluation.blockingReasons,
    approvalReasons: evaluation.approvalReasons,
    overrideApplied: false,
    insuranceVerificationId: verificationRecord?.id,
    evaluatedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  await persistPolicyEvent({
    bookingId: booking.id,
    userId: booking.userId,
    type: "coverage_decision_evaluated",
    status: "succeeded",
    coverageSource: evaluation.coverageSource,
    providerId: embeddedPolicyResult?.providerId ?? verification?.providerId,
    providerReferenceId: embeddedPolicyResult?.providerReferenceId ?? verification?.providerReferenceId,
    createdAt: now,
  });

  const isTerminalBookingStatus = ["confirmed", "active", "completed", "cancelled"].includes(booking.status);
  const isAdminControlledStatus = ["insurance_manual_review"].includes(booking.status);
  await updateDocument<Booking>(`bookings/${booking.id}`, {
    coverageDecisionStatus: decision.status,
    coverageSource: decision.coverageSource,
    insuranceVerificationStatus: verification?.status ?? "unsubmitted",
    insuranceBlockingReasons: decision.blockingReasons,
    insuranceReviewedAt: now,
    ...(decision.status === "approved" ? { insuranceClearedAt: now } : {}),
    ...(!isTerminalBookingStatus && !isAdminControlledStatus ? { status: evaluation.bookingStatus } : {}),
    updatedAt: now,
  });

  const updatedBooking = await getBookingById(booking.id);

  if (!updatedBooking) {
    throw new Error("Booking not found after coverage evaluation.");
  }

  return {
    booking: updatedBooking,
    decision,
    verification,
  };
}

function deriveOverrideCoverageSource(booking: Booking, existingDecision: CoverageDecision | null): CoverageSource {
  if (existingDecision?.coverageSource && existingDecision.coverageSource !== "none") {
    return existingDecision.coverageSource;
  }

  if (booking.rentalChannel === "platform") {
    return "platform_policy";
  }

  if (booking.rentalChannel === "partner") {
    return "partner_policy";
  }

  return "renter_policy";
}

export async function applyAdminOverride(bookingId: string, adminUserId: string, reason: string) {
  const trimmedReason = reason.trim();

  if (trimmedReason.length < 10) {
    throw new Error("Override reason must be at least 10 characters.");
  }

  const booking = await getBookingById(bookingId);

  if (!booking) {
    throw new Error("Booking not found.");
  }

  const existingDecision = await getLatestCoverageDecisionForBooking(bookingId);
  const now = new Date();
  const coverageSource = deriveOverrideCoverageSource(booking, existingDecision);

  let decision: CoverageDecision;

  if (existingDecision) {
    await updateDocument<CoverageDecision>(`${getCoverageDecisionCollectionPath()}/${existingDecision.id}`, {
      status: "approved",
      coverageSource,
      overrideApplied: true,
      overrideBy: adminUserId,
      overrideReason: trimmedReason,
      overrideAt: now,
      blockingReasons: [],
      approvalReasons: [
        ...new Set([...(existingDecision.approvalReasons ?? []), "Admin override applied after insurance review."]),
      ],
      updatedAt: now,
    });

    decision = {
      ...existingDecision,
      status: "approved",
      coverageSource,
      overrideApplied: true,
      overrideBy: adminUserId,
      overrideReason: trimmedReason,
      overrideAt: now,
      blockingReasons: [],
      approvalReasons: [...new Set([...(existingDecision.approvalReasons ?? []), "Admin override applied after insurance review."])],
      updatedAt: now,
    };
  } else {
    decision = await persistCoverageDecision({
      bookingId: booking.id,
      userId: booking.userId,
      rentalChannel: booking.rentalChannel ?? "direct",
      protectionPackage: booking.protectionPackage,
      riskLevel: booking.riskLevel,
      status: "approved",
      coverageSource,
      blockingReasons: [],
      approvalReasons: ["Admin override applied after insurance review."],
      overrideApplied: true,
      overrideBy: adminUserId,
      overrideReason: trimmedReason,
      overrideAt: now,
      evaluatedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }

  await persistPolicyEvent({
    bookingId: booking.id,
    userId: booking.userId,
    type: "override_applied",
    status: "succeeded",
    coverageSource,
    createdAt: now,
  });

  const overrideNote = `[${now.toISOString()}] Insurance override applied by ${adminUserId}: ${trimmedReason}`;

  await updateDocument<Booking>(`bookings/${booking.id}`, {
    status: "insurance_cleared",
    coverageDecisionStatus: "approved",
    coverageSource,
    insuranceOverrideApplied: true,
    insuranceBlockingReasons: [],
    insuranceReviewedAt: now,
    insuranceClearedAt: now,
    adminNotes: [booking.adminNotes, overrideNote].filter(Boolean).join("\n"),
    updatedAt: now,
  });

  void logAuditEvent({
    entityType: "insurance",
    entityId: booking.id,
    action: "insurance.override_applied",
    actorId: adminUserId,
    actorRole: "admin",
    before: existingDecision
      ? {
          status: existingDecision.status,
          coverageSource: existingDecision.coverageSource,
          overrideApplied: existingDecision.overrideApplied,
        }
      : undefined,
    after: {
      status: "approved",
      coverageSource,
      overrideApplied: true,
    },
    metadata: {
      bookingId: booking.id,
      overrideReason: trimmedReason,
      coverageDecisionId: decision.id,
    },
  });

  const updatedBooking = await getBookingById(booking.id);

  if (!updatedBooking) {
    throw new Error("Booking not found after override.");
  }

  return {
    booking: updatedBooking,
    decision,
  };
}
