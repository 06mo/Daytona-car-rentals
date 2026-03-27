import type { ProtectionPackage, ProtectionPackageId, ProtectionPricing } from "@/types";

const fallbackProtectionPricing: ProtectionPricing = {
  standard: 2500,
  premium: 4500,
  updatedAt: new Date(),
};

type ProtectionPackageConfig = Omit<ProtectionPackage, "dailyFee">;

const protectionPackageConfig: Record<ProtectionPackageId, ProtectionPackageConfig> = {
  basic: {
    id: "basic",
    name: "Basic - Use My Own Insurance",
    description: "No daily surcharge. Requires a valid insurance card on file before we can release the vehicle.",
    depositModifier: 1,
    cdwIncluded: false,
    requiresInsurance: true,
    liabilityLabel: "Uses renter's own insurance",
    badgeLabel: "Basic",
  },
  standard: {
    id: "standard",
    name: "Standard Protection",
    description: "Includes CDW with a $500 deductible plus standard roadside support.",
    depositModifier: 1,
    cdwIncluded: true,
    requiresInsurance: false,
    liabilityLabel: "$500 deductible",
    badgeLabel: "Standard",
  },
  premium: {
    id: "premium",
    name: "Full Protection",
    description: "Includes full waiver coverage, theft protection, and reduced deposit at pickup.",
    depositModifier: 0.5,
    cdwIncluded: true,
    requiresInsurance: false,
    liabilityLabel: "$0 deductible",
    badgeLabel: "Premium",
  },
};

export function getFallbackProtectionPricing() {
  return fallbackProtectionPricing;
}

export function isProtectionPackageId(value: unknown): value is ProtectionPackageId {
  return value === "basic" || value === "standard" || value === "premium";
}

export function getProtectionPackageDefinition(
  packageId: ProtectionPackageId,
  pricing: ProtectionPricing = fallbackProtectionPricing,
): ProtectionPackage {
  const config = protectionPackageConfig[packageId];
  const dailyFee = packageId === "premium" ? pricing.premium : packageId === "standard" ? pricing.standard : 0;

  return {
    ...config,
    dailyFee,
  };
}

export function listProtectionPackages(pricing: ProtectionPricing = fallbackProtectionPricing): ProtectionPackage[] {
  return (["basic", "standard", "premium"] as const).map((packageId) => getProtectionPackageDefinition(packageId, pricing));
}
