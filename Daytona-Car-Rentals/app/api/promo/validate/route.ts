import { NextResponse } from "next/server";

import { getDocument, FirebaseConfigError } from "@/lib/firebase/firestore";
import { requireAuth } from "@/lib/middleware/withAuth";
import { reportMonitoringEvent } from "@/lib/monitoring/monitoring";
import { isProtectionPackageId } from "@/lib/protection/config";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/security/rateLimit";
import { computeBookingPricingWithRules } from "@/lib/services/pricingService";
import { getProtectionPricing } from "@/lib/services/protectionService";
import { applyPromoCodeToPricing, getPromoCodeByCode } from "@/lib/services/promoService";
import { evaluateBookingRisk } from "@/lib/services/riskEngine";
import { getUserProfile } from "@/lib/services/userService";
import { getVehicleById } from "@/lib/services/vehicleService";
import type { BookingExtras, ExtrasPricing, ProtectionPackageId } from "@/types";

type ValidatePromoRequest = {
  code?: string;
  endDate?: string;
  extras?: BookingExtras;
  protectionPackage?: ProtectionPackageId;
  startDate?: string;
  vehicleId?: string;
};

export async function POST(request: Request) {
  try {
    const preAuthLimit = enforceRateLimit(request, rateLimitPolicies.paymentIntentCreate);

    if (preAuthLimit) {
      return preAuthLimit;
    }

    const user = await requireAuth(request);
    const body = (await request.json()) as ValidatePromoRequest;

    if (!body.code || !body.vehicleId || !body.startDate || !body.endDate || !body.extras || !body.protectionPackage) {
      return NextResponse.json(
        { error: "code, vehicleId, startDate, endDate, extras, and protectionPackage are required." },
        { status: 400 },
      );
    }

    if (!isProtectionPackageId(body.protectionPackage)) {
      return NextResponse.json({ error: "Protection package is invalid." }, { status: 422 });
    }

    const [vehicle, extrasPricing, protectionPricing, profile] = await Promise.all([
      getVehicleById(body.vehicleId),
      getDocument<ExtrasPricing>("extras_pricing/current"),
      getProtectionPricing(),
      getUserProfile(user.userId),
    ]);

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found." }, { status: 404 });
    }

    if (!extrasPricing) {
      return NextResponse.json({ error: "Extras pricing is not configured." }, { status: 503 });
    }

    const promoCode = await getPromoCodeByCode(body.code);

    if (!promoCode) {
      return NextResponse.json({ error: "Promo code is invalid." }, { status: 404 });
    }

    const riskProfile = await evaluateBookingRisk({
      userId: user.userId,
      vehicle,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      protectionPackage: body.protectionPackage,
      pricingPromoCode: promoCode.code,
      stripeCustomerId: profile?.stripeCustomerId,
    });

    if (!riskProfile.allowedProtectionPackages.includes(body.protectionPackage)) {
      return NextResponse.json(
        { error: "Selected protection package is not available for this booking risk profile.", riskProfile },
        { status: 422 },
      );
    }

    const basePricing = await computeBookingPricingWithRules(
      vehicle,
      extrasPricing,
      protectionPricing,
      body.extras,
      body.protectionPackage,
      new Date(body.startDate),
      new Date(body.endDate),
    );
    const pricing = applyPromoCodeToPricing(basePricing, promoCode, profile);

    return NextResponse.json({
      promoCode: {
        code: promoCode.code,
        name: promoCode.name,
      },
      pricing,
      riskProfile,
    });
  } catch (error) {
    await reportMonitoringEvent({
      source: "api.promo.validate",
      message: "Promo validation failed.",
      severity: "warning",
      error,
      context: {
        method: request.method,
        path: "/api/promo/validate",
      },
      alert: false,
    });

    if (error instanceof FirebaseConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    if (error instanceof Error && error.message === "Authentication required.") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Unable to validate promo code." }, { status: 500 });
  }
}
