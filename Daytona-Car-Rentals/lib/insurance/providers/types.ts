import type { InsuranceBlockingReason, ProtectionPackageId, RiskLevel } from "@/types";

export type EmbeddedPolicyQuoteRequest = {
  bookingId: string;
  userId: string;
  vehicleId: string;
  protectionPackage: Exclude<ProtectionPackageId, "basic">;
  startDate: Date;
  endDate: Date;
  riskLevel?: RiskLevel;
};

export type EmbeddedPolicyQuoteResult = {
  status: "quoted" | "manual_review" | "unavailable";
  providerId: string;
  providerReferenceId?: string;
  premiumCents?: number;
  blockingReasons: InsuranceBlockingReason[];
  approvalReasons?: string[];
  errorMessage?: string;
  rawPayload?: unknown;
};

export type EmbeddedPolicyBindRequest = EmbeddedPolicyQuoteRequest & {
  quoteReferenceId?: string;
};

export type EmbeddedPolicyBindResult = {
  status: "bound" | "manual_review" | "failed";
  providerId: string;
  providerReferenceId?: string;
  policyNumber?: string;
  blockingReasons: InsuranceBlockingReason[];
  approvalReasons?: string[];
  errorMessage?: string;
  rawPayload?: unknown;
};

export type RenterPolicyVerificationRequest = {
  bookingId: string;
  userId: string;
  vehicleId: string;
  startDate: Date;
  endDate: Date;
  documentId?: string;
  carrierName?: string;
};

export type RenterPolicyVerificationResult = {
  status: "verified" | "rejected" | "unverifiable" | "expired" | "manual_review";
  providerId: string;
  providerReferenceId?: string;
  blockingReasons: InsuranceBlockingReason[];
  carrierName?: string;
  namedInsuredMatch?: boolean;
  effectiveDate?: Date;
  expirationDate?: Date;
  hasComprehensiveCollision?: boolean;
  liabilityLimitsCents?: number;
  rentalUseConfirmed?: boolean;
  approvalReasons?: string[];
  errorMessage?: string;
  rawPayload?: unknown;
};

export interface ProviderAdapter {
  id: string;
  getQuote(input: EmbeddedPolicyQuoteRequest): Promise<EmbeddedPolicyQuoteResult>;
  bindPolicy(input: EmbeddedPolicyBindRequest): Promise<EmbeddedPolicyBindResult>;
  verifyRenterPolicy?(input: RenterPolicyVerificationRequest): Promise<RenterPolicyVerificationResult>;
}
