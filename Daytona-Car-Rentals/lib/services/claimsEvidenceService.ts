import "server-only";

import { FirebaseConfigError } from "@/lib/firebase/firestore";
import { getProtectionPackageDefinition } from "@/lib/protection/config";
import { getBookingTimeline } from "@/lib/services/adminService";
import { getAuditLogsForEntity } from "@/lib/services/auditService";
import { getChecklist } from "@/lib/services/checklistService";
import { getLatestCoverageDecisionForBooking } from "@/lib/services/coverageDecisionService";
import { getUserDocument, listUserDocuments } from "@/lib/services/documentService";
import { summarizeInsuranceVerificationForBooking } from "@/lib/services/insuranceVerificationService";
import { getUserProfile } from "@/lib/services/userService";
import { getVehicleById } from "@/lib/services/vehicleService";
import { listAdjustments } from "@/lib/services/adjustmentService";
import { getBookingById } from "@/lib/services/bookingService";
import type { ClaimsEvidencePackage } from "@/types";

function omitNullish<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== null && value !== undefined),
  ) as Partial<T>;
}

async function safeResolve<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    console.warn(`[claimsEvidenceService] Could not resolve ${label}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

export async function generateClaimsEvidencePackage(
  bookingId: string,
  adminUserId: string,
): Promise<ClaimsEvidencePackage> {
  const booking = await getBookingById(bookingId);

  if (!booking) {
    throw new Error("Booking not found.");
  }

  const [
    customerProfile,
    vehicle,
    pickupChecklist,
    dropoffChecklist,
    adjustments,
    insuranceSummary,
    coverageDecision,
    auditLogs,
    userDocuments,
  ] = await Promise.all([
    safeResolve("customerProfile", () => getUserProfile(booking.userId)),
    safeResolve("vehicle", () => getVehicleById(booking.vehicleId)),
    safeResolve("pickupChecklist", () => getChecklist(bookingId, "pickup")),
    safeResolve("dropoffChecklist", () => getChecklist(bookingId, "dropoff")),
    safeResolve("adjustments", () => listAdjustments(bookingId)),
    safeResolve("insuranceSummary", () => summarizeInsuranceVerificationForBooking(bookingId)),
    safeResolve("coverageDecision", () => getLatestCoverageDecisionForBooking(bookingId)),
    safeResolve("auditLogs", () => getAuditLogsForEntity(bookingId, 50)),
    safeResolve("userDocuments", () => listUserDocuments(booking.userId)),
  ]);

  // Booking snapshot — full record, dates serialised as ISO strings
  const bookingSnapshot: Record<string, unknown> = omitNullish({
    id: booking.id,
    userId: booking.userId,
    vehicleId: booking.vehicleId,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    stripePaymentIntentId: booking.stripePaymentIntentId,
    protectionPackage: booking.protectionPackage,
    rentalChannel: booking.rentalChannel ?? "direct",
    startDate: booking.startDate instanceof Date ? booking.startDate.toISOString() : booking.startDate,
    endDate: booking.endDate instanceof Date ? booking.endDate.toISOString() : booking.endDate,
    totalDays: booking.totalDays,
    pickupLocation: booking.pickupLocation,
    returnLocation: booking.returnLocation,
    extras: booking.extras,
    pricing: booking.pricing,
    riskScore: booking.riskScore,
    riskLevel: booking.riskLevel,
    riskFlags: booking.riskFlags,
    rentalChannelValue: booking.rentalChannel,
    platformTripId: booking.platformTripId,
    partnerId: booking.partnerId,
    referralCode: booking.referralCode,
    coverageDecisionStatus: booking.coverageDecisionStatus,
    coverageSource: booking.coverageSource,
    insuranceVerificationStatus: booking.insuranceVerificationStatus,
    insuranceBlockingReasons: booking.insuranceBlockingReasons,
    insuranceClearedAt: booking.insuranceClearedAt instanceof Date ? booking.insuranceClearedAt.toISOString() : booking.insuranceClearedAt,
    insuranceReviewedAt: booking.insuranceReviewedAt instanceof Date ? booking.insuranceReviewedAt.toISOString() : booking.insuranceReviewedAt,
    insuranceOverrideApplied: booking.insuranceOverrideApplied,
    paymentAuthorizedAt: booking.paymentAuthorizedAt instanceof Date ? booking.paymentAuthorizedAt.toISOString() : booking.paymentAuthorizedAt,
    confirmedAt: booking.confirmedAt instanceof Date ? booking.confirmedAt.toISOString() : booking.confirmedAt,
    completedAt: booking.completedAt instanceof Date ? booking.completedAt.toISOString() : booking.completedAt,
    cancelledAt: booking.cancelledAt instanceof Date ? booking.cancelledAt.toISOString() : booking.cancelledAt,
    cancelledBy: booking.cancelledBy,
    cancellationReason: booking.cancellationReason,
    adminNotes: booking.adminNotes,
    createdAt: booking.createdAt instanceof Date ? booking.createdAt.toISOString() : booking.createdAt,
    updatedAt: booking.updatedAt instanceof Date ? booking.updatedAt.toISOString() : booking.updatedAt,
  });

  // Renter snapshot — operationally necessary fields only, no PII beyond name/email
  const renterSnapshot: Record<string, unknown> = omitNullish({
    userId: booking.userId,
    displayName: customerProfile?.displayName,
    email: customerProfile?.email,
    verificationStatus: customerProfile?.verificationStatus,
    repeatCustomer: customerProfile?.repeatCustomer,
    repeatCustomerSince: customerProfile?.repeatCustomerSince instanceof Date
      ? customerProfile.repeatCustomerSince.toISOString()
      : customerProfile?.repeatCustomerSince,
  });

  // Vehicle snapshot — key operational fields
  const vehicleSnapshot: Record<string, unknown> = vehicle
    ? omitNullish({
        id: vehicle.id,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        category: vehicle.category,
        dailyRate: vehicle.dailyRate,
      })
    : { vehicleId: booking.vehicleId, note: "Vehicle record unavailable at time of package generation." };

  // Protection package summary
  let protectionSummary: Record<string, unknown> = { packageId: booking.protectionPackage };
  try {
    const pkg = getProtectionPackageDefinition(booking.protectionPackage);
    protectionSummary = omitNullish({
      id: pkg.id,
      name: pkg.name,
      liabilityLabel: pkg.liabilityLabel,
    });
  } catch {
    // leave minimal fallback above
  }

  // Insurance verification summary
  const insuranceVerificationSummary: Record<string, unknown> | null = insuranceSummary
    ? omitNullish({
        verificationId: insuranceSummary.verificationId,
        status: insuranceSummary.status,
        blockingReasons: insuranceSummary.blockingReasons,
        approvalReasons: insuranceSummary.approvalReasons,
        carrierName: insuranceSummary.carrierName,
        namedInsuredMatch: insuranceSummary.namedInsuredMatch,
        effectiveDate: insuranceSummary.effectiveDate instanceof Date ? insuranceSummary.effectiveDate.toISOString() : insuranceSummary.effectiveDate,
        expirationDate: insuranceSummary.expirationDate instanceof Date ? insuranceSummary.expirationDate.toISOString() : insuranceSummary.expirationDate,
        hasComprehensiveCollision: insuranceSummary.hasComprehensiveCollision,
        liabilityLimitsCents: insuranceSummary.liabilityLimitsCents,
        rentalUseConfirmed: insuranceSummary.rentalUseConfirmed,
        verifiedBy: insuranceSummary.verifiedBy,
        providerId: insuranceSummary.providerId,
        documentId: insuranceSummary.documentId,
        resolvedAt: insuranceSummary.resolvedAt instanceof Date ? insuranceSummary.resolvedAt.toISOString() : insuranceSummary.resolvedAt,
        coverageDecisionStatus: insuranceSummary.coverageDecisionStatus,
        coverageSource: insuranceSummary.coverageSource,
        overrideApplied: insuranceSummary.overrideApplied,
        overrideBy: insuranceSummary.overrideBy,
        overrideReason: insuranceSummary.overrideReason,
        overrideAt: insuranceSummary.overrideAt instanceof Date ? insuranceSummary.overrideAt.toISOString() : insuranceSummary.overrideAt,
      })
    : null;

  // Coverage decision summary
  const coverageDecisionSummary: Record<string, unknown> | null = coverageDecision
    ? omitNullish({
        id: coverageDecision.id,
        status: coverageDecision.status,
        coverageSource: coverageDecision.coverageSource,
        blockingReasons: coverageDecision.blockingReasons,
        approvalReasons: coverageDecision.approvalReasons,
        overrideApplied: coverageDecision.overrideApplied,
        overrideBy: coverageDecision.overrideBy,
        overrideReason: coverageDecision.overrideReason,
        overrideAt: coverageDecision.overrideAt instanceof Date ? coverageDecision.overrideAt.toISOString() : coverageDecision.overrideAt,
        rentalChannel: coverageDecision.rentalChannel,
        protectionPackage: coverageDecision.protectionPackage,
        riskLevel: coverageDecision.riskLevel,
        insuranceVerificationId: coverageDecision.insuranceVerificationId,
        evaluatedAt: coverageDecision.evaluatedAt instanceof Date ? coverageDecision.evaluatedAt.toISOString() : coverageDecision.evaluatedAt,
        createdAt: coverageDecision.createdAt instanceof Date ? coverageDecision.createdAt.toISOString() : coverageDecision.createdAt,
      })
    : null;

  // Checklist refs and photo/signature collection
  const pickupChecklistRef = pickupChecklist ? `bookings/${bookingId}/checklists/pickup` : null;
  const dropoffChecklistRef = dropoffChecklist ? `bookings/${bookingId}/checklists/dropoff` : null;

  const signatureRefs: string[] = [];
  const checklistPhotoRefs: string[] = [];

  if (pickupChecklist) {
    if (pickupChecklist.adminSignature) signatureRefs.push(`bookings/${bookingId}/checklists/pickup#adminSignature`);
    if (pickupChecklist.customerSignature) signatureRefs.push(`bookings/${bookingId}/checklists/pickup#customerSignature`);
    if (pickupChecklist.photoRefs?.length) checklistPhotoRefs.push(...pickupChecklist.photoRefs);
  }

  if (dropoffChecklist) {
    if (dropoffChecklist.adminSignature) signatureRefs.push(`bookings/${bookingId}/checklists/dropoff#adminSignature`);
    if (dropoffChecklist.customerSignature) signatureRefs.push(`bookings/${bookingId}/checklists/dropoff#customerSignature`);
    if (dropoffChecklist.photoRefs?.length) checklistPhotoRefs.push(...dropoffChecklist.photoRefs);
  }

  // Adjustments summary
  const adjustmentsSummary: Record<string, unknown>[] = (adjustments ?? []).map((adj) =>
    omitNullish({
      id: adj.id,
      type: adj.type,
      amountCents: adj.amountCents,
      status: adj.status,
      reason: adj.reason,
      customerVisibleNote: adj.customerVisibleNote,
      createdBy: adj.createdBy,
      createdAt: adj.createdAt instanceof Date ? adj.createdAt.toISOString() : adj.createdAt,
      waivedAt: adj.waivedAt instanceof Date ? adj.waivedAt.toISOString() : adj.waivedAt,
      waivedBy: adj.waivedBy,
      paidAt: adj.paidAt instanceof Date ? adj.paidAt.toISOString() : adj.paidAt,
      extensionDetails: adj.extensionDetails
        ? omitNullish({
            originalEndDate: adj.extensionDetails.originalEndDate instanceof Date ? adj.extensionDetails.originalEndDate.toISOString() : adj.extensionDetails.originalEndDate,
            newEndDate: adj.extensionDetails.newEndDate instanceof Date ? adj.extensionDetails.newEndDate.toISOString() : adj.extensionDetails.newEndDate,
            additionalDays: adj.extensionDetails.additionalDays,
            dailyRate: adj.extensionDetails.dailyRate,
          })
        : undefined,
    }),
  );

  // Payment summary
  const paymentSummary: Record<string, unknown> = omitNullish({
    stripePaymentIntentId: booking.stripePaymentIntentId,
    paymentStatus: booking.paymentStatus,
    totalAmount: booking.pricing.totalAmount,
    depositAmount: booking.pricing.depositAmount,
    paymentAuthorizedAt: booking.paymentAuthorizedAt instanceof Date
      ? booking.paymentAuthorizedAt.toISOString()
      : booking.paymentAuthorizedAt,
  });

  // Booking timeline
  const rawTimeline = getBookingTimeline(booking);
  const timelineSummary: Record<string, unknown>[] = rawTimeline.map((item) => ({
    label: item.label,
    time: item.time instanceof Date ? item.time.toISOString() : item.time,
  }));

  // Audit event refs (ids from the last 50 events for this booking)
  const auditEventRefs: string[] = (auditLogs ?? []).map((log) => log.id);

  // Document verification context (metadata only — no file contents)
  const insuranceCardDoc = userDocuments?.find((doc) => doc.type === "insurance_card");
  const driverLicenseDoc = userDocuments?.find((doc) => doc.type === "drivers_license");

  const documentVerificationContext: Record<string, unknown> = omitNullish({
    insurance_card: insuranceCardDoc
      ? omitNullish({
          status: insuranceCardDoc.status,
          uploadedAt: insuranceCardDoc.uploadedAt instanceof Date ? insuranceCardDoc.uploadedAt.toISOString() : insuranceCardDoc.uploadedAt,
          reviewedAt: insuranceCardDoc.reviewedAt instanceof Date ? insuranceCardDoc.reviewedAt.toISOString() : insuranceCardDoc.reviewedAt,
          rejectionReason: insuranceCardDoc.rejectionReason,
        })
      : undefined,
    drivers_license: driverLicenseDoc
      ? omitNullish({
          status: driverLicenseDoc.status,
          uploadedAt: driverLicenseDoc.uploadedAt instanceof Date ? driverLicenseDoc.uploadedAt.toISOString() : driverLicenseDoc.uploadedAt,
          reviewedAt: driverLicenseDoc.reviewedAt instanceof Date ? driverLicenseDoc.reviewedAt.toISOString() : driverLicenseDoc.reviewedAt,
          rejectionReason: driverLicenseDoc.rejectionReason,
        })
      : undefined,
  });

  const generatedAt = new Date();

  return {
    id: `ep-${bookingId}-${generatedAt.getTime()}`,
    bookingId,
    generatedAt,
    generatedBy: adminUserId,
    bookingSnapshot,
    renterSnapshot,
    vehicleSnapshot,
    protectionSummary,
    insuranceVerificationSummary,
    coverageDecisionSummary,
    pickupChecklistRef,
    dropoffChecklistRef,
    signatureRefs,
    checklistPhotoRefs,
    adjustmentsSummary,
    paymentSummary,
    timelineSummary,
    auditEventRefs,
    // Extended field not in base type but included for consumers
    ...(Object.keys(documentVerificationContext).length > 0 ? { documentVerificationContext } : {}),
  } as ClaimsEvidencePackage & { documentVerificationContext?: Record<string, unknown> };
}
