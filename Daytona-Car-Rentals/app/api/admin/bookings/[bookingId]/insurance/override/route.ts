import { NextResponse } from "next/server";

import { withAuth } from "@/lib/middleware/withAuth";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/security/rateLimit";
import { getBookingById } from "@/lib/services/bookingService";
import { applyAdminOverride } from "@/lib/services/coverageDecisionService";
import { summarizeInsuranceVerificationForBooking } from "@/lib/services/insuranceVerificationService";

type RequestBody = {
  reason?: string;
};

type RouteContext = {
  params: Promise<{ bookingId: string }>;
};

export const POST = withAuth(async (request, context: RouteContext, user) => {
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

  const body = (await request.json()) as RequestBody;

  if (!body.reason?.trim()) {
    return NextResponse.json({ error: "Override reason is required." }, { status: 400 });
  }

  const result = await applyAdminOverride(bookingId, user.userId, body.reason);
  const summary = await summarizeInsuranceVerificationForBooking(bookingId);

  return NextResponse.json({
    booking: result.booking,
    decision: result.decision,
    summary,
  });
});
