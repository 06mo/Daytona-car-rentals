import { NextResponse } from "next/server";

import { FirebaseConfigError } from "@/lib/firebase/firestore";
import { requireAuth } from "@/lib/middleware/withAuth";
import { reportMonitoringEvent } from "@/lib/monitoring/monitoring";
import { isProtectionPackageId } from "@/lib/protection/config";
import { rateLimitPolicies, enforceRateLimit } from "@/lib/security/rateLimit";
import { logAnalyticsEvent } from "@/lib/services/analyticsService";
import { getPartnerByCode } from "@/lib/services/partnerService";
import { computeBookingPricingWithRules } from "@/lib/services/pricingService";
import { getProtectionPricing } from "@/lib/services/protectionService";
import { applyPromoCodeToPricing, getPromoCodeByCode } from "@/lib/services/promoService";
import { evaluateBookingRisk } from "@/lib/services/riskEngine";
import { createBooking } from "@/lib/services/bookingService";
import { getDocument } from "@/lib/firebase/firestore";
import { getUserDocument } from "@/lib/services/documentService";
import { retrievePaymentIntent, StripeConfigError } from "@/lib/stripe/server";
import { getUserProfile } from "@/lib/services/userService";
import type { BookingExtras, ExtrasPricing, ProtectionPackageId, UserProfile } from "@/types";
import { getVehicleById } from "@/lib/services/vehicleService";

type CreateBookingRequest = {
  vehicleId?: string;
  startDate?: string;
  endDate?: string;
  pickupLocation?: string;
  returnLocation?: string;
  extras?: BookingExtras;
  protectionPackage?: ProtectionPackageId;
  paymentIntentId?: string;
  adminNotes?: string;
  promoCode?: string;
  referralCode?: string;
};

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: Request) {
  try {
    const preAuthLimit = enforceRateLimit(request, rateLimitPolicies.bookingCreate);

    if (preAuthLimit) {
      return preAuthLimit;
    }

    const user = await requireAuth(request);
    const body = (await request.json()) as CreateBookingRequest;

    if (
      !body.vehicleId ||
      !body.startDate ||
      !body.endDate ||
      !body.pickupLocation ||
      !body.returnLocation ||
      !body.extras ||
      !body.protectionPackage ||
      !body.paymentIntentId
    ) {
      return badRequest("Missing required booking fields.");
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

    const paymentIntent = await retrievePaymentIntent(body.paymentIntentId);

    if (!["succeeded", "requires_capture"].includes(paymentIntent.status)) {
      return NextResponse.json({ error: "Payment has not been confirmed." }, { status: 409 });
    }

    if (paymentIntent.metadata.userId !== user.userId) {
      return NextResponse.json({ error: "Payment intent does not belong to the authenticated user." }, { status: 403 });
    }

    if (paymentIntent.metadata.vehicleId !== body.vehicleId) {
      return NextResponse.json({ error: "Payment intent vehicle does not match request." }, { status: 409 });
    }

    if (paymentIntent.metadata.protectionPackage !== body.protectionPackage) {
      return NextResponse.json({ error: "Payment intent protection package does not match request." }, { status: 409 });
    }

    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);
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

    if (body.protectionPackage === "basic") {
      const insuranceDocument = await getUserDocument(user.userId, "insurance_card");

      if (!insuranceDocument) {
        return NextResponse.json(
          { error: "insurance_required", message: "Basic protection requires a valid insurance card on file." },
          { status: 422 },
        );
      }

      if (insuranceDocument.status === "rejected") {
        return NextResponse.json(
          {
            error: "insurance_rejected",
            message: "Your insurance card was rejected. Please upload a valid card or select a different protection package.",
          },
          { status: 422 },
        );
      }
    }

    if (paymentIntent.metadata.totalAmount !== String(pricing.totalAmount)) {
      return NextResponse.json({ error: "Payment intent total does not match the latest booking total." }, { status: 409 });
    }

    if (paymentIntent.metadata.depositAmount !== String(pricing.depositAmount)) {
      return NextResponse.json({ error: "Payment intent deposit does not match the latest booking deposit." }, { status: 409 });
    }

    if ((paymentIntent.metadata.promoCode ?? "") !== (promoCode?.code ?? "")) {
      return NextResponse.json({ error: "Payment intent promo code does not match request." }, { status: 409 });
    }

    const stripeCustomerId =
      typeof paymentIntent.customer === "string"
        ? paymentIntent.customer
        : (await getDocument<UserProfile>(`users/${user.userId}`))?.stripeCustomerId;

    if (!stripeCustomerId) {
      return NextResponse.json({ error: "Stripe customer is missing for this payment intent." }, { status: 409 });
    }

    const partner = body.referralCode ? await getPartnerByCode(body.referralCode) : null;

    const booking = await createBooking(
      {
        userId: user.userId,
        vehicleId: body.vehicleId,
        protectionPackage: body.protectionPackage,
        riskScore: riskProfile.score,
        riskLevel: riskProfile.level,
        riskFlags: riskProfile.flags,
        ...(body.referralCode ? { referralCode: body.referralCode } : {}),
        ...(partner ? { partnerId: partner.id } : {}),
        startDate,
        endDate,
        pickupLocation: body.pickupLocation,
        returnLocation: body.returnLocation,
        extras: body.extras,
        pricing,
        stripePaymentIntentId: body.paymentIntentId,
        stripeCustomerId,
        status: "pending_verification",
        adminNotes: body.adminNotes,
      },
      user.userId,
      user.role,
    );

    if (booking) {
      void logAnalyticsEvent({
        eventName: "booking_created",
        path: "/api/bookings/create",
        userId: user.userId,
        metadata: {
          bookingId: booking.id,
          vehicleId: booking.vehicleId,
          totalAmount: booking.pricing.totalAmount,
          protectionPackage: booking.protectionPackage,
          promoCode: booking.pricing.promoCode,
          referralCode: booking.referralCode,
          partnerId: booking.partnerId,
        },
      });
    }

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    await reportMonitoringEvent({
      source: "api.bookings.create",
      message: "Booking creation request failed.",
      severity: error instanceof StripeConfigError ? "critical" : "error",
      error,
      context: {
        method: request.method,
        path: "/api/bookings/create",
      },
    });

    if (error instanceof FirebaseConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    if (error instanceof StripeConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    if (error instanceof Error) {
      if (error.message === "Authentication required.") {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }

      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Unable to create booking." }, { status: 500 });
  }
}
