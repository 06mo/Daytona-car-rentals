import type { Partner } from "@/types/partner";
import type { ProtectionPackageId } from "@/types/protection";
import type { RiskLevel } from "@/types/risk";
import type {
  CoverageDecisionStatus,
  CoverageSource,
  InsuranceBlockingReason,
  InsuranceVerificationStatus,
  RentalChannel,
} from "@/types/insurance";

export type CoverageVerificationInput = {
  status: InsuranceVerificationStatus;
  blockingReasons: InsuranceBlockingReason[];
};

export type CoverageRules = {
  channel: RentalChannel;
  preferredCoverageSource: CoverageSource;
  allowsEmbeddedPolicy: boolean;
  requiresPartnerCoverageDeclaration: boolean;
  requiresPlatformTripId: boolean;
  requiresVerifiedRenterPolicy: boolean;
  requiresManualReviewForHighRisk: boolean;
};

export type CoverageEvaluationResult = {
  approvalReasons: string[];
  blockingReasons: InsuranceBlockingReason[];
  coverageSource: CoverageSource;
  status: CoverageDecisionStatus;
};

export function getRequiredCoverageForChannel(
  channel: RentalChannel,
  protectionPackage: ProtectionPackageId,
  riskLevel?: RiskLevel,
): CoverageRules {
  if (channel === "platform") {
    return {
      channel,
      preferredCoverageSource: "platform_policy",
      allowsEmbeddedPolicy: false,
      requiresPartnerCoverageDeclaration: false,
      requiresPlatformTripId: true,
      requiresVerifiedRenterPolicy: false,
      requiresManualReviewForHighRisk: false,
    };
  }

  if (channel === "partner") {
    return {
      channel,
      preferredCoverageSource: "partner_policy",
      allowsEmbeddedPolicy: false,
      requiresPartnerCoverageDeclaration: true,
      requiresPlatformTripId: false,
      requiresVerifiedRenterPolicy: false,
      requiresManualReviewForHighRisk: false,
    };
  }

  if (protectionPackage === "basic") {
    return {
      channel,
      preferredCoverageSource: "renter_policy",
      allowsEmbeddedPolicy: false,
      requiresPartnerCoverageDeclaration: false,
      requiresPlatformTripId: false,
      requiresVerifiedRenterPolicy: true,
      requiresManualReviewForHighRisk: false,
    };
  }

  return {
    channel,
    preferredCoverageSource: protectionPackage === "premium" && riskLevel === "high" ? "renter_policy" : "embedded_policy",
    allowsEmbeddedPolicy: true,
    requiresPartnerCoverageDeclaration: false,
    requiresPlatformTripId: false,
    requiresVerifiedRenterPolicy: false,
    requiresManualReviewForHighRisk: protectionPackage === "premium" && riskLevel === "high",
  };
}

export function evaluateVerificationAgainstRules(
  verification: CoverageVerificationInput | null,
  rules: CoverageRules,
): InsuranceBlockingReason[] {
  if (!verification) {
    return rules.requiresVerifiedRenterPolicy ? ["no_document_on_file"] : ["manual_review_required"];
  }

  if (verification.status === "verified") {
    return verification.blockingReasons;
  }

  if (verification.blockingReasons.length > 0) {
    return verification.blockingReasons;
  }

  switch (verification.status) {
    case "expired":
      return ["coverage_expired"];
    case "rejected":
      return ["admin_rejected"];
    case "unsubmitted":
      return ["no_document_on_file"];
    case "pending":
    case "unverifiable":
    default:
      return ["manual_review_required"];
  }
}

export function shouldAutoApprove(
  channel: RentalChannel,
  protectionPackage: ProtectionPackageId,
  verification: CoverageVerificationInput | null,
  riskLevel?: RiskLevel,
  partner?: Partner | null,
  platformTripId?: string,
): boolean {
  if (channel === "platform") {
    return Boolean(platformTripId?.trim()) && Boolean(partner && partner.status === "active");
  }

  if (channel === "partner") {
    return Boolean(
      partner &&
        partner.status === "active" &&
        partner.coverageResponsibility &&
        partner.coverageResponsibility !== "daytona",
    );
  }

  if (protectionPackage === "basic") {
    return verification?.status === "verified" && verification.blockingReasons.length === 0;
  }

  if (protectionPackage === "premium" && riskLevel === "high") {
    return false;
  }

  return verification?.status === "verified" && verification.blockingReasons.length === 0;
}

export function shouldEscalateToManualReview(
  channel: RentalChannel,
  protectionPackage: ProtectionPackageId,
  riskLevel: RiskLevel | undefined,
  verification: CoverageVerificationInput | null,
): boolean {
  if (channel === "platform") {
    return verification?.status === "unverifiable";
  }

  if (channel === "partner") {
    return false;
  }

  if (protectionPackage === "premium" && riskLevel === "high") {
    return true;
  }

  if (!verification) {
    return protectionPackage !== "basic";
  }

  return ["pending", "unsubmitted", "unverifiable"].includes(verification.status);
}
