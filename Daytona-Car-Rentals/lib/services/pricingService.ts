import "server-only";

import { FirebaseConfigError, listDocuments } from "@/lib/firebase/firestore";
import type { BookingExtras, BookingPricing, ExtrasPricing, PricingRule, ProtectionPackageId, ProtectionPricing, Vehicle } from "@/types";
import { computeBookingPricing } from "@/lib/utils/pricing";

export async function getPricingRules(): Promise<PricingRule[]> {
  try {
    return await listDocuments<PricingRule>("pricing_rules", {
      filters: [{ field: "active", operator: "==", value: true }],
    });
  } catch (error) {
    if (error instanceof FirebaseConfigError) {
      return [];
    }

    console.error("[pricing] Failed to load pricing rules:", error);
    return [];
  }
}

export async function computeBookingPricingWithRules(
  vehicle: Vehicle,
  extrasPricing: ExtrasPricing,
  protectionPricing: ProtectionPricing,
  extras: BookingExtras,
  protectionPackage: ProtectionPackageId,
  startDate: Date,
  endDate: Date,
): Promise<BookingPricing> {
  const rules = await getPricingRules();
  return computeBookingPricing(vehicle, extrasPricing, protectionPricing, extras, protectionPackage, startDate, endDate, rules);
}
