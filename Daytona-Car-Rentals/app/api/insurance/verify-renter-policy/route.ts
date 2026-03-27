import { NextResponse } from "next/server";

import { FirebaseConfigError } from "@/lib/firebase/firestore";
import { requireAuth } from "@/lib/middleware/withAuth";
import { reportMonitoringEvent } from "@/lib/monitoring/monitoring";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/security/rateLimit";
import { getBookingById } from "@/lib/services/bookingService";
import {
  createInsuranceVerificationRequest,
  finalizeInsuranceVerification,
  getLatestInsuranceVerificationForBooking,
  summarizeInsuranceVerificationForBooking,
} from "@/lib/services/insuranceVerificationService";
import type { InsuranceBlockingReason, InsuranceVerificationStatus } from "@/types";

type VerifyRenterPolicyRequest = {
  action?: "request" | "finalize";
  bookingId?: string;
  result?: {
    blockingReasons?: InsuranceBlockingReason[];
    carrierName?: string;
    commercialUseAllowed?: boolean;
    documentId?: string;
    documentReadable?: boolean;
    effectiveDate?: string;
    expirationDate?: string;
    hasComprehensiveCollision?: boolean;
    liabilityLimitsCents?: number;
    namedInsuredMatch?: boolean;
    peerToPeerAllowed?: boolean;
    policyActive?: boolean;
    providerId?: string;
    providerReferenceId?: string;
    rentalUseConfirmed?: boolean;
    requiredFieldsPresent?: boolean;
    status?: InsuranceVerificationStatus;
    verifiedBy?: "admin" | "provider" | "system";
  };
  vehicleId?: string;
};

function parseDate(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const limitResponse = enforceRateLimit(request, rateLimitPolicies.insuranceVerification, user.userId);

    if (limitResponse) {
      return limitResponse;
    }

    const body = (await request.json()) as VerifyRenterPolicyRequest;

    if (!body.bookingId) {
      return NextResponse.json({ error: "bookingId is required." }, { status: 400 });
    }

    const booking = await getBookingById(body.bookingId);

    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    if (body.vehicleId && body.vehicleId !== booking.vehicleId) {
      return NextResponse.json({ error: "Vehicle does not match the booking." }, { status: 409 });
    }

    if (user.role !== "admin" && booking.userId !== user.userId) {
      return NextResponse.json({ error: "You do not have access to this booking." }, { status: 403 });
    }

    if ((booking.rentalChannel ?? "direct") !== "direct") {
      return NextResponse.json(
        { error: "Renter policy verification is only available for direct bookings." },
        { status: 409 },
      );
    }

    const action = body.action ?? "request";

    if (action === "finalize") {
      if (user.role !== "admin") {
        return NextResponse.json({ error: "Admin access required to finalize verification." }, { status: 403 });
      }

      const latestVerification = await getLatestInsuranceVerificationForBooking(booking.id);

      if (!latestVerification) {
        return NextResponse.json({ error: "No insurance verification request exists for this booking." }, { status: 404 });
      }

      const finalized = await finalizeInsuranceVerification({
        verificationId: latestVerification.id,
        actorId: user.userId,
        actorRole: user.role,
        ...body.result,
        effectiveDate: parseDate(body.result?.effectiveDate),
        expirationDate: parseDate(body.result?.expirationDate),
      });

      return NextResponse.json({ verification: finalized.summary });
    }

    const created = await createInsuranceVerificationRequest({
      bookingId: booking.id,
      userId: booking.userId,
      actorId: user.userId,
      actorRole: user.role,
      documentId: body.result?.documentId,
      providerId: body.result?.providerId,
      providerReferenceId: body.result?.providerReferenceId,
    });

    const summary = await summarizeInsuranceVerificationForBooking(booking.id);
    return NextResponse.json({ verification: summary ?? created.summary }, { status: 201 });
  } catch (error) {
    await reportMonitoringEvent({
      source: "api.insurance.verify_renter_policy",
      message: "Renter policy verification request failed.",
      severity: error instanceof FirebaseConfigError ? "warning" : "error",
      error,
      context: {
        method: request.method,
        path: "/api/insurance/verify-renter-policy",
      },
      alert: !(error instanceof FirebaseConfigError),
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

    return NextResponse.json({ error: "Unable to verify renter policy." }, { status: 500 });
  }
}
