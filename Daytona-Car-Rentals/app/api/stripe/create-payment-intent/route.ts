import { NextResponse } from "next/server";

import { getDocument, FirebaseConfigError } from "@/lib/firebase/firestore";
import { requireAuth } from "@/lib/middleware/withAuth";
import { reportMonitoringEvent } from "@/lib/monitoring/monitoring";
import { isProtectionPackageId } from "@/lib/protection/config";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/security/rateLimit";
import { logAnalyticsEvent } from "@/lib/services/analyticsService";
import { isVehicleAvailable } from "@/lib/services/bookingService";
import { computeBookingPricingWithRules } from "@/lib/services/pricingService";
import { getProtectionPricing } from "@/lib/services/protectionService";
import { applyPromoCodeToPricing, getPromoCodeByCode } from "@/lib/services/promoService";
import { evaluateBookingRisk } from "@/lib/services/riskEngine";
import { getUserProfile } from "@/lib/services/userService";
import { getVehicleById } from "@/lib/services/vehicleService";
import { createPaymentIntentForBooking, StripeConfigError } from "@/lib/stripe/server";
import type { BookingExtras, ExtrasPricing, ProtectionPackageId } from "@/types";

type CreatePaymentIntentRequest = {
  vehicleId?: string;
  startDate?: string;
  endDate?: string;
  extras?: BookingExtras;
  protectionPackage?: ProtectionPackageId;
  promoCode?: string;
  referralCode?: string;
};

export async function POST(request: Request) {
  try {
    const preAuthLimit = enforceRateLimit(request, rateLimitPolicies.paymentIntentCreate);

    if (preAuthLimit) {
      return preAuthLimit;
    }

    const user = await requireAuth(request);
    const body = (await request.json()) as CreatePaymentIntentRequest;

    if (!body.vehicleId || !body.startDate || !body.endDate || !body.extras || !body.protectionPackage) {
      return NextResponse.json({ error: "Missing required payment intent fields." }, { status: 400 });
    }

    if (!isProtectionPackageId(body.protectionPackage)) {
      return NextResponse.json({ error: "Protection package is invalid." }, { status: 422 });
    }

    const vehicle = await getVehicleById(body.vehicleId);

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found." }, { status: 404 });
    }

    const [extrasPricing, protectionPricing] = await Promise.all([
      getDocument<ExtrasPricing>("extras_pricing/current"),
      getProtectionPricing(),
    ]);

    if (!extrasPricing) {
      return NextResponse.json({ error: "Extras pricing is not configured." }, { status: 503 });
    }

    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);
    const available = await isVehicleAvailable(body.vehicleId, startDate, endDate);

    if (!available) {
      return NextResponse.json({ error: "Vehicle is not available for the selected dates." }, { status: 409 });
    }

    const [profile, promoCode] = await Promise.all([
      getUserProfile(user.userId),
      body.promoCode ? getPromoCodeByCode(body.promoCode) : Promise.resolve(null),
    ]);

    if (body.promoCode && !promoCode) {
      return NextResponse.json({ error: "Promo code is invalid." }, { status: 404 });
    }

    const riskProfile = await evaluateBookingRisk({
      userId: user.userId,
      vehicle,
      startDate,
      endDate,
      protectionPackage: body.protectionPackage,
      pricingPromoCode: promoCode?.code,
      stripeCustomerId: profile?.stripeCustomerId,
    });

    if (!riskProfile.allowedProtectionPackages.includes(body.protectionPackage)) {
      return NextResponse.json(
        {
          error: "Selected protection package is not available for this booking risk profile.",
          riskProfile,
        },
        { status: 422 },
      );
    }

    const computedPricing = await computeBookingPricingWithRules(
      vehicle,
      extrasPricing,
      protectionPricing,
      body.extras,
      body.protectionPackage,
      startDate,
      endDate,
    );
    const pricing = body.promoCode
      ? applyPromoCodeToPricing(computedPricing, promoCode, profile)
      : computedPricing;
    const { paymentIntent } = await createPaymentIntentForBooking({
      userId: user.userId,
      userEmail: user.email,
      vehicle,
      pricing,
      protectionPackage: body.protectionPackage,
      startDate,
      endDate,
      promoCode: promoCode?.code,
      referralCode: body.referralCode,
    });

    void logAnalyticsEvent({
      eventName: "checkout_started",
      path: "/api/stripe/create-payment-intent",
      userId: user.userId,
      metadata: {
        vehicleId: body.vehicleId,
        paymentIntentId: paymentIntent.id,
        totalAmount: pricing.totalAmount,
        protectionPackage: body.protectionPackage,
        promoCode: promoCode?.code,
        referralCode: body.referralCode,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      pricing,
      riskProfile,
    });
  } catch (error) {
    await reportMonitoringEvent({
      source: "api.stripe.create_payment_intent",
      message: "Payment intent creation failed.",
      severity: error instanceof StripeConfigError ? "critical" : "error",
      error,
      context: {
        method: request.method,
        path: "/api/stripe/create-payment-intent",
      },
    });

    if (error instanceof FirebaseConfigError || error instanceof StripeConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    if (error instanceof Error && error.message === "Authentication required.") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Unable to create payment intent." }, { status: 500 });
  }
}
