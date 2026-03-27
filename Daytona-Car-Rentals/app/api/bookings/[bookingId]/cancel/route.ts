import { NextResponse } from "next/server";

import { FirebaseConfigError } from "@/lib/firebase/firestore";
import { withAuth } from "@/lib/middleware/withAuth";
import { reportMonitoringEvent } from "@/lib/monitoring/monitoring";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/security/rateLimit";
import { cancelBooking } from "@/lib/services/bookingService";
import { getBookingById } from "@/lib/services/bookingService";
import { refundPaymentIntent, StripeConfigError } from "@/lib/stripe/server";

type CancelBookingRequest = {
  cancellationReason?: string;
  cancelledBy?: "customer" | "admin";
};

type RouteContext = {
  params: Promise<{
    bookingId: string;
  }>;
};

export const PATCH = withAuth<RouteContext>(async (request, context, user) => {
  try {
    const limitResponse = enforceRateLimit(request, rateLimitPolicies.bookingCancel, user.userId);

    if (limitResponse) {
      return limitResponse;
    }

    const { bookingId } = await context.params;
    const body = (await request.json()) as CancelBookingRequest;
    const existingBooking = await getBookingById(bookingId);

    if (!existingBooking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    if (existingBooking.userId !== user.userId && user.role !== "admin") {
      return NextResponse.json({ error: "You do not have permission to cancel this booking." }, { status: 403 });
    }

    if (existingBooking.paymentStatus === "paid") {
      await refundPaymentIntent(existingBooking.stripePaymentIntentId);
    }

    const booking = await cancelBooking(
      bookingId,
      body.cancellationReason,
      user.role === "admin" ? "admin" : "customer",
      user.userId,
      user.role,
    );

    return NextResponse.json({ booking });
  } catch (error) {
    const { bookingId } = await context.params;

    await reportMonitoringEvent({
      source: "api.bookings.cancel",
      message: "Booking cancellation failed.",
      severity: error instanceof StripeConfigError ? "critical" : "error",
      error,
      context: {
        bookingId,
        path: `/api/bookings/${bookingId}/cancel`,
      },
    });

    if (error instanceof FirebaseConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    if (error instanceof StripeConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Unable to cancel booking." }, { status: 500 });
  }
});
