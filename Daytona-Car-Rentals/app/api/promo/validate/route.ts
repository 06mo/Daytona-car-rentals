import { NextResponse } from "next/server";

import { getDocument, FirebaseConfigError } from "@/lib/firebase/firestore";
import { requireAuth } from "@/lib/middleware/withAuth";
import { reportMonitoringEvent } from "@/lib/monitoring/monitoring";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/security/rateLimit";
import { computeBookingPricingWithRules } from "@/lib/services/pricingService";
import { applyPromoCodeToPricing, getPromoCodeByCode } from "@/lib/services/promoService";
import { getUserProfile } from "@/lib/services/userService";
import { getVehicleById } from "@/lib/services/vehicleService";
import type { BookingExtras, ExtrasPricing } from "@/types";

type ValidatePromoRequest = {
  code?: string;
  endDate?: string;
  extras?: BookingExtras;
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

    if (!body.code || !body.vehicleId || !body.startDate || !body.endDate || !body.extras) {
      return NextResponse.json({ error: "code, vehicleId, startDate, endDate, and extras are required." }, { status: 400 });
    }

    const [vehicle, extrasPricing, profile] = await Promise.all([
      getVehicleById(body.vehicleId),
      getDocument<ExtrasPricing>("extras_pricing/current"),
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

    const basePricing = await computeBookingPricingWithRules(
      vehicle,
      extrasPricing,
      body.extras,
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
