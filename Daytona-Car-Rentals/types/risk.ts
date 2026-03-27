import type { ProtectionPackageId } from "@/types/protection";

export type RiskLevel = "low" | "medium" | "high";

export type RiskAssessment = {
  score: number;
  level: RiskLevel;
  flags: string[];
};

export type BookingRiskProfile = RiskAssessment & {
  allowedProtectionPackages: ProtectionPackageId[];
  reviewRequired: boolean;
};
