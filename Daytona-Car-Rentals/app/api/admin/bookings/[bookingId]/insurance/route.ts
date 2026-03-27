import { NextResponse } from "next/server";

import { withAuth } from "@/lib/middleware/withAuth";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/security/rateLimit";
import { getBookingById } from "@/lib/services/bookingService";
import { getLatestCoverageDecisionForBooking } from "@/lib/services/coverageDecisionService";
import { getLatestInsuranceVerificationForBooking, summarizeInsuranceVerificationForBooking } from "@/lib/services/insuranceVerificationService";

type RouteContext = {
  params: Promise<{ bookingId: string }>;
};

export const GET = withAuth(async (request, context: RouteContext, user) => {
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

  const [summary, verification, decision] = await Promise.all([
    summarizeInsuranceVerificationForBooking(bookingId),
    getLatestInsuranceVerificationForBooking(bookingId),
    getLatestCoverageDecisionForBooking(bookingId),
  ]);

  return NextResponse.json({
    bookingId,
    summary,
    verification,
    decision,
  });
});
