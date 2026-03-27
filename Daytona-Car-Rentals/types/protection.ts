export type ProtectionPackageId = "basic" | "standard" | "premium";

export type ProtectionPackage = {
  id: ProtectionPackageId;
  name: string;
  description: string;
  dailyFee: number;
  depositModifier: number;
  cdwIncluded: boolean;
  requiresInsurance: boolean;
  liabilityLabel: string;
  badgeLabel: string;
};

export type ProtectionPricing = {
  standard: number;
  premium: number;
  updatedAt: Date;
};
