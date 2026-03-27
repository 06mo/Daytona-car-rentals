import "server-only";

import { addDocument, FirebaseConfigError, getDocument, listDocuments, updateDocument } from "@/lib/firebase/firestore";
import { normalizeInsuranceVerificationResult, type NormalizeInsuranceVerificationInput } from "@/lib/insurance/normalize";
import { reportMonitoringEvent } from "@/lib/monitoring/monitoring";
import {
  evaluateCoverageDecisionForBooking,
  getLatestCoverageDecisionForBooking,
} from "@/lib/services/coverageDecisionService";
import { getUserDocument } from "@/lib/services/documentService";
import { getBookingById } from "@/lib/services/bookingService";
import { logAuditEvent } from "@/lib/services/auditService";
import type {
  AuditActorRole,
  Booking,
  InsuranceVerification,
  InsuranceVerificationSummary,
} from "@/types";

const globalMockStore = globalThis as typeof globalThis & {
  __daytonaInsuranceVerifications?: InsuranceVerification[];
};

const mockInsuranceVerifications = globalMockStore.__daytonaInsuranceVerifications ?? [];

if (!globalMockStore.__daytonaInsuranceVerifications) {
  globalMockStore.__daytonaInsuranceVerifications = mockInsuranceVerifications;
}

type CreateInsuranceVerificationRequestInput = {
  actorId?: string;
  actorRole?: AuditActorRole;
  bookingId: string;
  documentId?: string;
  providerId?: string;
  providerReferenceId?: string;
  userId: string;
};

type FinalizeInsuranceVerificationInput = NormalizeInsuranceVerificationInput & {
  actorId?: string;
  actorRole?: AuditActorRole;
  verificationId: string;
};

function getCollectionPath() {
  return "insurance_verifications";
}

function getDocumentPath(verificationId: string) {
  return `${getCollectionPath()}/${verificationId}`;
}

function getMockVerificationById(verificationId: string) {
  return mockInsuranceVerifications.find((record) => record.id === verificationId) ?? null;
}

async function getVerificationById(verificationId: string) {
  try {
    return await getDocument<InsuranceVerification>(getDocumentPath(verificationId));
  } catch (error) {
    if (!(error instanceof FirebaseConfigError)) {
      throw error;
    }

    return getMockVerificationById(verificationId);
  }
}

async function safelyReevaluateCoverage(bookingId: string) {
  try {
    return await evaluateCoverageDecisionForBooking(bookingId);
  } catch (error) {
    await reportMonitoringEvent({
      source: "services.insuranceVerification",
      message: "Coverage decision re-evaluation failed after insurance verification update.",
      severity: error instanceof FirebaseConfigError ? "warning" : "error",
      error,
      context: {
        bookingId,
      },
      alert: !(error instanceof FirebaseConfigError),
    });

    return null;
  }
}

function toSummary(booking: Booking, verification: InsuranceVerification | null): InsuranceVerificationSummary {
  const summary: InsuranceVerificationSummary = {
    bookingId: booking.id,
    verificationId: verification?.id,
    status: verification?.status ?? "unsubmitted",
    blockingReasons: verification?.blockingReasons ?? [],
    carrierName: verification?.carrierName,
    namedInsuredMatch: verification?.namedInsuredMatch,
    effectiveDate: verification?.effectiveDate,
    expirationDate: verification?.expirationDate,
    hasComprehensiveCollision: verification?.hasComprehensiveCollision,
    liabilityLimitsCents: verification?.liabilityLimitsCents,
    rentalUseConfirmed: verification?.rentalUseConfirmed,
    verifiedBy: verification?.verifiedBy,
    providerId: verification?.providerId,
    documentId: verification?.documentId,
    resolvedAt: verification?.resolvedAt,
    updatedAt: verification?.updatedAt,
    coverageDecisionStatus: booking.coverageDecisionStatus,
    coverageSource: booking.coverageSource,
    bookingStatus: booking.status,
    overrideApplied: booking.insuranceOverrideApplied,
  };

  return summary;
}

async function toSummaryWithDecision(booking: Booking, verification: InsuranceVerification | null): Promise<InsuranceVerificationSummary> {
  const summary = toSummary(booking, verification);
  const decision = await getLatestCoverageDecisionForBooking(booking.id);

  if (!decision) {
    return summary;
  }

  return {
    ...summary,
    approvalReasons: decision.approvalReasons,
    overrideApplied: decision.overrideApplied,
    overrideBy: decision.overrideBy,
    overrideReason: decision.overrideReason,
    overrideAt: decision.overrideAt,
  };
}

export async function getLatestInsuranceVerificationForBooking(bookingId: string) {
  try {
    const records = await listDocuments<InsuranceVerification>(getCollectionPath(), {
      filters: [{ field: "bookingId", operator: "==", value: bookingId }],
      orderBy: [{ field: "createdAt", direction: "desc" }],
      limit: 1,
    });

    return records[0] ?? null;
  } catch (error) {
    if (!(error instanceof FirebaseConfigError)) {
      throw error;
    }

    return mockInsuranceVerifications
      .filter((record) => record.bookingId === bookingId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;
  }
}

export async function summarizeInsuranceVerificationForBooking(bookingId: string) {
  const booking = await getBookingById(bookingId);

  if (!booking) {
    throw new Error("Booking not found.");
  }

  const verification = await getLatestInsuranceVerificationForBooking(bookingId);
  return toSummaryWithDecision(booking, verification);
}

export async function createInsuranceVerificationRequest(input: CreateInsuranceVerificationRequestInput) {
  const booking = await getBookingById(input.bookingId);

  if (!booking) {
    throw new Error("Booking not found.");
  }

  if (booking.userId !== input.userId) {
    throw new Error("Booking does not belong to the provided user.");
  }

  const insuranceDocument = await getUserDocument(input.userId, "insurance_card");

  if (!insuranceDocument) {
    throw new Error("Insurance card is required before verification can begin.");
  }

  const now = new Date();
  const payload: Omit<InsuranceVerification, "id"> = {
    bookingId: booking.id,
    userId: booking.userId,
    vehicleId: booking.vehicleId,
    rentalChannel: booking.rentalChannel ?? "direct",
    protectionPackage: booking.protectionPackage,
    status: "pending",
    blockingReasons: [],
    verifiedBy: "system",
    providerId: input.providerId,
    providerReferenceId: input.providerReferenceId,
    documentId: input.documentId ?? insuranceDocument.id,
    createdAt: now,
    updatedAt: now,
  };

  let verificationId: string;

  try {
    verificationId = await addDocument(getCollectionPath(), payload);
  } catch (error) {
    if (!(error instanceof FirebaseConfigError)) {
      throw error;
    }

    verificationId = `mock-verification-${now.getTime()}`;
    mockInsuranceVerifications.push({ id: verificationId, ...payload });
  }

  const verification = (await getVerificationById(verificationId)) ?? { id: verificationId, ...payload };

  void logAuditEvent({
    entityType: "insurance",
    entityId: booking.id,
    action: "insurance.verification_requested",
    actorId: input.actorId ?? input.userId,
    actorRole: input.actorRole ?? "customer",
    metadata: {
      verificationId,
      bookingId: booking.id,
      documentId: verification.documentId,
      providerId: verification.providerId,
    },
  });

  const reevaluation = await safelyReevaluateCoverage(booking.id);
  const updatedBooking = reevaluation?.booking ?? (await getBookingById(booking.id)) ?? booking;

  return {
    booking: updatedBooking,
    verification,
    summary: await toSummaryWithDecision(updatedBooking, verification),
  };
}

export async function finalizeInsuranceVerification(input: FinalizeInsuranceVerificationInput) {
  const verification = await getVerificationById(input.verificationId);

  if (!verification) {
    throw new Error("Insurance verification not found.");
  }

  const normalized = normalizeInsuranceVerificationResult(input);
  const now = new Date();
  const patch: Partial<InsuranceVerification> = {
    ...normalized,
    updatedAt: now,
  };

  try {
    await updateDocument<InsuranceVerification>(getDocumentPath(verification.id), patch);
  } catch (error) {
    if (!(error instanceof FirebaseConfigError)) {
      throw error;
    }

    const mockVerification = getMockVerificationById(verification.id);

    if (!mockVerification) {
      throw new Error("Insurance verification not found.");
    }

    Object.assign(mockVerification, patch);
  }

  const updatedVerification = (await getVerificationById(verification.id)) ?? { ...verification, ...patch };
  const booking = await getBookingById(updatedVerification.bookingId);

  if (!booking) {
    throw new Error("Booking not found.");
  }

  const auditActorRole: AuditActorRole =
    input.actorRole ?? (input.verifiedBy === "admin" ? "admin" : input.verifiedBy === "system" ? "system" : "system");

  void logAuditEvent({
    entityType: "insurance",
    entityId: booking.id,
    action: "insurance.verification_resolved",
    actorId: input.actorId ?? "system",
    actorRole: auditActorRole,
    before: {
      status: verification.status,
      blockingReasons: verification.blockingReasons,
    },
    after: {
      status: updatedVerification.status,
      blockingReasons: updatedVerification.blockingReasons,
    },
    metadata: {
      verificationId: updatedVerification.id,
      providerId: updatedVerification.providerId,
      documentId: updatedVerification.documentId,
    },
  });

  const reevaluation = await safelyReevaluateCoverage(booking.id);
  const updatedBooking = reevaluation?.booking ?? (await getBookingById(booking.id)) ?? booking;

  return {
    booking: updatedBooking,
    verification: updatedVerification,
    summary: await toSummaryWithDecision(updatedBooking, updatedVerification),
  };
}
