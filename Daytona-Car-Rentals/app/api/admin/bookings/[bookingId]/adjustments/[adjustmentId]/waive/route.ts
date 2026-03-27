import { NextResponse } from "next/server";

import { withAuth } from "@/lib/middleware/withAuth";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/security/rateLimit";
import { waiveAdjustment } from "@/lib/services/adjustmentService";

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
  const adjustment = await waiveAdjustment(bookingId, adjustmentId, user.userId, user.role);

  return NextResponse.json({ adjustment });
});
