import { NextResponse } from "next/server";

import { withAuth } from "@/lib/middleware/withAuth";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/security/rateLimit";
import { getAdjustment, markAdjustmentPaymentRequested } from "@/lib/services/adjustmentService";
import { getBookingById } from "@/lib/services/bookingService";
import { notifyAdjustmentPaymentRequired } from "@/lib/services/notificationService";
import { createCheckoutSessionForAdjustment } from "@/lib/stripe/server";
import { getUserProfile } from "@/lib/services/userService";

type RouteContext = {
  params: Promise<{ bookingId: string; adjustmentId: string }>;
};

export const POST = withAuth<RouteContext>(async (request, context, user) => {
  const limitResponse = enforceRateLimit(request, rateLimitPolicies.adminMutation, user.userId);

  if (limitResponse) {
    return limitResponse;
  }

  if (user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { bookingId, adjustmentId } = await context.params;
  const booking = await getBookingById(bookingId);

  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  const [adjustment, customer] = await Promise.all([getAdjustment(bookingId, adjustmentId), getUserProfile(booking.userId)]);

  if (!adjustment) {
    return NextResponse.json({ error: "Adjustment not found." }, { status: 404 });
  }

  if (adjustment.status !== "pending") {
    return NextResponse.json({ error: "Only pending adjustments can request payment." }, { status: 409 });
  }

  if (adjustment.stripePaymentLinkUrl) {
    return NextResponse.json({ error: "Payment already requested." }, { status: 409 });
  }

  const session = await createCheckoutSessionForAdjustment({
    adjustment,
    booking,
    customerEmail: customer?.email ?? null,
  });

  if (!session.url) {
    return NextResponse.json({ error: "Stripe did not return a checkout URL." }, { status: 503 });
  }

  const updatedAdjustment = await markAdjustmentPaymentRequested(
    bookingId,
    adjustmentId,
    session.url,
    user.userId,
    user.role,
  );

  if (customer && updatedAdjustment) {
    await notifyAdjustmentPaymentRequired(booking, updatedAdjustment, customer);
  }

  return NextResponse.json({
    adjustment: updatedAdjustment,
    paymentLinkUrl: session.url,
  });
});
