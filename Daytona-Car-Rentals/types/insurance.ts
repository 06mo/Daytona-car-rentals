import type { ProtectionPackageId } from "@/types/protection";
import type { RiskLevel } from "@/types/risk";

export type RentalChannel = "direct" | "platform" | "partner";

export type InsuranceVerificationStatus =
  | "unsubmitted"
  | "pending"
  | "verified"
  | "rejected"
  | "expired"
  | "unverifiable";

export type CoverageDecisionStatus = "approved" | "manual_review" | "rejected";

export type CoverageSource = "renter_policy" | "embedded_policy" | "platform_policy" | "partner_policy" | "none";

export type InsuranceBlockingReason =
  | "policy_not_active"
  | "name_mismatch"
  | "liability_limits_too_low"
  | "rental_use_excluded"
  | "peer_to_peer_excluded"
  | "commercial_use_excluded"
  | "document_unreadable"
  | "missing_required_fields"
  | "coverage_expired"
  | "no_document_on_file"
  | "provider_unavailable"
  | "platform_trip_id_missing"
  | "partner_not_active"
  | "partner_coverage_not_declared"
  | "admin_rejected"
  | "manual_review_required";

export interface InsuranceVerification {
  id: string;
  bookingId: string;
  userId: string;
  vehicleId: string;
  rentalChannel: RentalChannel;
  protectionPackage: ProtectionPackageId;
  status: InsuranceVerificationStatus;
  blockingReasons: InsuranceBlockingReason[];
  carrierName?: string;
  namedInsuredMatch?: boolean;
  effectiveDate?: Date;
  expirationDate?: Date;
  hasComprehensiveCollision?: boolean;
  liabilityLimitsCents?: number;
  rentalUseConfirmed?: boolean;
  verifiedBy: "admin" | "provider" | "system";
  providerId?: string;
  providerReferenceId?: string;
  documentId?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

export interface CoverageDecision {
  id: string;
  bookingId: string;
  userId: string;
  rentalChannel: RentalChannel;
  protectionPackage: ProtectionPackageId;
  riskLevel?: RiskLevel;
  status: CoverageDecisionStatus;
  coverageSource: CoverageSource;
  blockingReasons: InsuranceBlockingReason[];
  approvalReasons?: string[];
  overrideApplied: boolean;
  overrideBy?: string;
  overrideReason?: string;
  overrideAt?: Date;
  insuranceVerificationId?: string;
  evaluatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type PolicyEventType =
  | "verification_initiated"
  | "verification_resolved"
  | "coverage_decision_evaluated"
  | "policy_bound"
  | "policy_bind_failed"
  | "policy_cancelled"
  | "override_applied";

export interface PolicyEvent {
  id: string;
  bookingId: string;
  userId: string;
  type: PolicyEventType;
  status: "attempted" | "succeeded" | "failed";
  coverageSource: CoverageSource;
  providerId?: string;
  providerReferenceId?: string;
  errorMessage?: string;
  createdAt: Date;
}

export interface ClaimsEvidencePackage {
  id: string;
  bookingId: string;
  generatedAt: Date;
  generatedBy: string;
  bookingSnapshot: Record<string, unknown>;
  renterSnapshot: Record<string, unknown>;
  vehicleSnapshot: Record<string, unknown>;
  protectionSummary: Record<string, unknown>;
  insuranceVerificationSummary: Record<string, unknown> | null;
  coverageDecisionSummary: Record<string, unknown> | null;
  pickupChecklistRef: string | null;
  dropoffChecklistRef: string | null;
  signatureRefs: string[];
  checklistPhotoRefs: string[];
  adjustmentsSummary: Record<string, unknown>[];
  paymentSummary: Record<string, unknown>;
  timelineSummary: Record<string, unknown>[];
  auditEventRefs: string[];
}
