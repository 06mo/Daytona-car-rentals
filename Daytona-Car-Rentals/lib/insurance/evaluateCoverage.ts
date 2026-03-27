import type { Partner, ProtectionPackageId, RiskLevel } from "@/types";
import type { EmbeddedPolicyBindResult } from "@/lib/insurance/providers/types";
import type {
  CoverageDecisionStatus,
  CoverageSource,
  InsuranceBlockingReason,
  InsuranceVerification,
  RentalChannel,
} from "@/types/insurance";

import {
  evaluateVerificationAgainstRules,
  getRequiredCoverageForChannel,
  shouldAutoApprove,
  shouldEscalateToManualReview,
  type CoverageEvaluationResult,
} from "@/lib/insurance/rules";

export type EvaluateCoverageDecisionInput = {
  bookingId: string;
  userId: string;
  vehicleId: string;
  rentalChannel: RentalChannel;
  protectionPackage: ProtectionPackageId;
  startDate: Date;
  endDate: Date;
  riskLevel?: RiskLevel;
  partner?: Partner | null;
  platformTripId?: string;
  verification?: InsuranceVerification | null;
  embeddedPolicyResult?: EmbeddedPolicyBindResult | null;
};

export type EvaluatedCoverageDecision = CoverageEvaluationResult & {
  bookingStatus: "payment_authorized" | "insurance_pending" | "insurance_manual_review" | "insurance_cleared";
};

function uniqueReasons(reasons: InsuranceBlockingReason[]) {
  return Array.from(new Set(reasons));
}

function getRejectedStatus(
  protectionPackage: ProtectionPackageId,
  verificationStatus?: InsuranceVerification["status"],
) {
  if (verificationStatus === "pending") {
    return "insurance_pending" as const;
  }

  if (protectionPackage === "basic") {
    return "payment_authorized" as const;
  }

  return "insurance_manual_review" as const;
}

export function evaluateCoverageDecision(input: EvaluateCoverageDecisionInput): EvaluatedCoverageDecision {
  const rules = getRequiredCoverageForChannel(input.rentalChannel, input.protectionPackage, input.riskLevel);
  const verification = input.verification ?? null;
  const verificationBlockingReasons = uniqueReasons(evaluateVerificationAgainstRules(verification, rules));

  if (input.rentalChannel === "platform") {
    if (!input.platformTripId?.trim()) {
      return {
        status: "rejected",
        coverageSource: "none",
        blockingReasons: ["platform_trip_id_missing"],
        approvalReasons: [],
        bookingStatus: "payment_authorized",
      };
    }

    if (!input.partner || input.partner.status !== "active") {
      return {
        status: "manual_review",
        coverageSource: "platform_policy",
        blockingReasons: ["partner_not_active"],
        approvalReasons: [],
        bookingStatus: "insurance_manual_review",
      };
    }

    return {
      status: "approved",
      coverageSource: "platform_policy",
      blockingReasons: [],
      approvalReasons: ["Platform trip linkage is present and mapped to an active platform partner."],
      bookingStatus: "insurance_cleared",
    };
  }

  if (input.rentalChannel === "partner") {
    if (!input.partner || input.partner.status !== "active") {
      return {
        status: "rejected",
        coverageSource: "none",
        blockingReasons: ["partner_not_active"],
        approvalReasons: [],
        bookingStatus: "payment_authorized",
      };
    }

    if (!input.partner.coverageResponsibility) {
      return {
        status: "rejected",
        coverageSource: "none",
        blockingReasons: ["partner_coverage_not_declared"],
        approvalReasons: [],
        bookingStatus: "payment_authorized",
      };
    }

    if (input.partner.coverageResponsibility === "daytona") {
      return {
        status: "manual_review",
        coverageSource: "none",
        blockingReasons: ["manual_review_required"],
        approvalReasons: [],
        bookingStatus: "insurance_manual_review",
      };
    }

    return {
      status: "approved",
      coverageSource: "partner_policy",
      blockingReasons: [],
      approvalReasons: [`Partner coverage responsibility is declared as ${input.partner.coverageResponsibility}.`],
      bookingStatus: "insurance_cleared",
    };
  }

  if (
    shouldAutoApprove(
      input.rentalChannel,
      input.protectionPackage,
      verification,
      input.riskLevel,
      input.partner,
      input.platformTripId,
    )
  ) {
    const coverageSource: CoverageSource = input.embeddedPolicyResult?.status === "bound" ? "embedded_policy" : "renter_policy";
    const approvalReasons =
      input.embeddedPolicyResult?.status === "bound"
        ? input.embeddedPolicyResult.approvalReasons ?? ["Embedded coverage policy bound successfully."]
        : ["Renter coverage is verified for this booking."];

    return {
      status: "approved",
      coverageSource,
      blockingReasons: [],
      approvalReasons,
      bookingStatus: "insurance_cleared",
    };
  }

  if (input.embeddedPolicyResult) {
    if (input.embeddedPolicyResult.status === "bound") {
      return {
        status: "approved",
        coverageSource: "embedded_policy",
        blockingReasons: [],
        approvalReasons: input.embeddedPolicyResult.approvalReasons ?? ["Embedded coverage policy bound successfully."],
        bookingStatus: "insurance_cleared",
      };
    }

    const providerBlockingReasons = uniqueReasons(
      input.embeddedPolicyResult.blockingReasons.length > 0
        ? input.embeddedPolicyResult.blockingReasons
        : ["provider_unavailable"],
    );

    return {
      status: "manual_review",
      coverageSource: "embedded_policy",
      blockingReasons: providerBlockingReasons,
      approvalReasons: [],
      bookingStatus: "insurance_manual_review",
    };
  }

  if (shouldEscalateToManualReview(input.rentalChannel, input.protectionPackage, input.riskLevel, verification)) {
    const blockingReasons = uniqueReasons(
      verificationBlockingReasons.length > 0 ? verificationBlockingReasons : ["manual_review_required"],
    );

    return {
      status: "manual_review",
      coverageSource: rules.preferredCoverageSource,
      blockingReasons,
      approvalReasons: [],
      bookingStatus: verification?.status === "pending" ? "insurance_pending" : "insurance_manual_review",
    };
  }

  const blockingReasons = uniqueReasons(
    verificationBlockingReasons.length > 0 ? verificationBlockingReasons : ["manual_review_required"],
  );

  const rejectedStatus: CoverageDecisionStatus = "rejected";

  return {
    status: rejectedStatus,
    coverageSource: input.protectionPackage === "basic" ? "renter_policy" : "none",
    blockingReasons,
    approvalReasons: [],
    bookingStatus: getRejectedStatus(input.protectionPackage, verification?.status),
  };
}
