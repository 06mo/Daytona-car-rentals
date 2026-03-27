import type { InsuranceBlockingReason, InsuranceVerificationStatus } from "@/types";

export type NormalizeInsuranceVerificationInput = {
  blockingReasons?: InsuranceBlockingReason[];
  carrierName?: string;
  commercialUseAllowed?: boolean;
  documentId?: string;
  documentReadable?: boolean;
  effectiveDate?: Date;
  expirationDate?: Date;
  hasComprehensiveCollision?: boolean;
  liabilityLimitsCents?: number;
  minimumLiabilityLimitsCents?: number;
  namedInsuredMatch?: boolean;
  peerToPeerAllowed?: boolean;
  policyActive?: boolean;
  providerId?: string;
  providerReferenceId?: string;
  rentalUseConfirmed?: boolean;
  requiredFieldsPresent?: boolean;
  status?: InsuranceVerificationStatus;
  verifiedBy?: "admin" | "provider" | "system";
};

export type NormalizedInsuranceVerificationResult = {
  blockingReasons: InsuranceBlockingReason[];
  carrierName?: string;
  documentId?: string;
  effectiveDate?: Date;
  expirationDate?: Date;
  hasComprehensiveCollision?: boolean;
  liabilityLimitsCents?: number;
  namedInsuredMatch?: boolean;
  providerId?: string;
  providerReferenceId?: string;
  rentalUseConfirmed?: boolean;
  resolvedAt?: Date;
  status: InsuranceVerificationStatus;
  verifiedBy: "admin" | "provider" | "system";
};

function uniqueReasons(reasons: InsuranceBlockingReason[]) {
  return Array.from(new Set(reasons));
}

function resolveStatus(
  explicitStatus: InsuranceVerificationStatus | undefined,
  blockingReasons: InsuranceBlockingReason[],
  expirationDate?: Date,
) {
  if (expirationDate && expirationDate.getTime() < Date.now()) {
    return "expired" as const;
  }

  if (explicitStatus) {
    return explicitStatus;
  }

  if (blockingReasons.length === 0) {
    return "verified" as const;
  }

  if (
    blockingReasons.some((reason) =>
      ["provider_unavailable", "document_unreadable", "missing_required_fields", "manual_review_required"].includes(reason),
    )
  ) {
    return "unverifiable" as const;
  }

  if (blockingReasons.includes("coverage_expired")) {
    return "expired" as const;
  }

  return "rejected" as const;
}

export function normalizeInsuranceVerificationResult(
  input: NormalizeInsuranceVerificationInput,
): NormalizedInsuranceVerificationResult {
  const blockingReasons = [...(input.blockingReasons ?? [])];

  if (input.policyActive === false) {
    blockingReasons.push("policy_not_active");
  }

  if (input.namedInsuredMatch === false) {
    blockingReasons.push("name_mismatch");
  }

  if (
    typeof input.liabilityLimitsCents === "number" &&
    typeof input.minimumLiabilityLimitsCents === "number" &&
    input.liabilityLimitsCents < input.minimumLiabilityLimitsCents
  ) {
    blockingReasons.push("liability_limits_too_low");
  }

  if (input.rentalUseConfirmed === false) {
    blockingReasons.push("rental_use_excluded");
  }

  if (input.peerToPeerAllowed === false) {
    blockingReasons.push("peer_to_peer_excluded");
  }

  if (input.commercialUseAllowed === false) {
    blockingReasons.push("commercial_use_excluded");
  }

  if (input.documentReadable === false) {
    blockingReasons.push("document_unreadable");
  }

  if (input.requiredFieldsPresent === false) {
    blockingReasons.push("missing_required_fields");
  }

  if (input.expirationDate && input.expirationDate.getTime() < Date.now()) {
    blockingReasons.push("coverage_expired");
  }

  const dedupedBlockingReasons = uniqueReasons(blockingReasons);
  const status = resolveStatus(input.status, dedupedBlockingReasons, input.expirationDate);

  return {
    status,
    blockingReasons: dedupedBlockingReasons,
    carrierName: input.carrierName,
    namedInsuredMatch: input.namedInsuredMatch,
    effectiveDate: input.effectiveDate,
    expirationDate: input.expirationDate,
    hasComprehensiveCollision: input.hasComprehensiveCollision,
    liabilityLimitsCents: input.liabilityLimitsCents,
    rentalUseConfirmed: input.rentalUseConfirmed,
    verifiedBy: input.verifiedBy ?? "system",
    providerId: input.providerId,
    providerReferenceId: input.providerReferenceId,
    documentId: input.documentId,
    resolvedAt: status === "pending" ? undefined : new Date(),
  };
}
