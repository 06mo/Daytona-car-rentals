import "server-only";

import { FirebaseConfigError, listDocuments } from "@/lib/firebase/firestore";
import type { BookingPricing, PromoCode, UserProfile } from "@/types";

export async function getPromoCodeByCode(code: string): Promise<PromoCode | null> {
  try {
    const results = await listDocuments<PromoCode>("promo_codes", {
      filters: [
        { field: "code", operator: "==", value: code.trim().toUpperCase() },
        { field: "active", operator: "==", value: true },
      ],
      limit: 1,
    });

    return results[0] ?? null;
  } catch (error) {
    if (error instanceof FirebaseConfigError) {
      return null;
    }

    console.error("[promo] Failed to load promo code:", error);
    return null;
  }
}

export function applyPromoCodeToPricing(
  pricing: BookingPricing,
  promoCode: PromoCode | null,
  user?: UserProfile | null,
): BookingPricing {
  if (!promoCode) {
    return pricing;
  }

  if (promoCode.expiresAt && promoCode.expiresAt.getTime() < Date.now()) {
    throw new Error("This promo code has expired.");
  }

  if (promoCode.repeatCustomersOnly && !user?.repeatCustomer) {
    throw new Error("This promo code is only available to returning customers.");
  }

  const subtotal = pricing.totalAmount;

  if (promoCode.minSubtotalAmount && subtotal < promoCode.minSubtotalAmount) {
    throw new Error(`This promo code requires a subtotal of at least $${Math.round(promoCode.minSubtotalAmount / 100)}.`);
  }

  const rawDiscount = promoCode.type === "percent"
    ? Math.round(subtotal * (promoCode.amount / 100))
    : promoCode.amount;
  const cappedDiscount = promoCode.maxDiscountAmount
    ? Math.min(rawDiscount, promoCode.maxDiscountAmount)
    : rawDiscount;
  const promoDiscountAmount = Math.min(cappedDiscount, subtotal);

  return {
    ...pricing,
    totalAmount: Math.max(pricing.totalAmount - promoDiscountAmount, 0),
    promoDiscountAmount,
    promoCode: promoCode.code,
    promoCodeName: promoCode.name,
  };
}
