import "server-only";

import { FirebaseConfigError, getDocument } from "@/lib/firebase/firestore";
import type { ProtectionPricing } from "@/types";
import { getFallbackProtectionPricing } from "@/lib/protection/config";

export async function getProtectionPricing(): Promise<ProtectionPricing> {
  try {
    const protectionPricing = await getDocument<ProtectionPricing>("protection_pricing/current");
    return protectionPricing ?? getFallbackProtectionPricing();
  } catch (error) {
    if (error instanceof FirebaseConfigError) {
      return getFallbackProtectionPricing();
    }

    console.error("[protection] Failed to load protection pricing:", error);
    return getFallbackProtectionPricing();
  }
}
