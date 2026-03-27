import "server-only";

import { addDocument, FirebaseConfigError, listDocuments, updateDocument } from "@/lib/firebase/firestore";
import { evaluateCoverageDecision } from "@/lib/insurance/evaluateCoverage";
import { listPartners } from "@/lib/services/partnerService";
import { getUserDocument } from "@/lib/services/documentService";
import { getBookingById } from "@/lib/services/bookingService";
import type { Booking, CoverageDecision, InsuranceVerification, PolicyEvent } from "@/types";

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
    providerId: verification?.providerId,
    providerReferenceId: verification?.providerReferenceId,
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
