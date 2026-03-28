import { NextResponse } from "next/server";

import { withAuth } from "@/lib/middleware/withAuth";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/security/rateLimit";
import { getAgreementForBooking } from "@/lib/services/rentalAgreementService";
import { getBookingById } from "@/lib/services/bookingService";

type RouteContext = {
  params: Promise<{ bookingId: string }>;
};

export const GET = withAuth<RouteContext>(async (request, context, user) => {
  const limitResponse = enforceRateLimit(request, rateLimitPolicies.adminMutation, user.userId);

  if (limitResponse) {
    return limitResponse;
  }

  if (user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { bookingId } = await context.params;
  const booking = await getBookingById(bookingId);

  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  const agreement = await getAgreementForBooking(bookingId);
  return NextResponse.json({ agreement });
});
