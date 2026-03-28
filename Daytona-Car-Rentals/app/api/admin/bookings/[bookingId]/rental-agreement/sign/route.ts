import { NextResponse } from "next/server";

import { withAuth } from "@/lib/middleware/withAuth";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/security/rateLimit";
import { getBookingById } from "@/lib/services/bookingService";
import { recordPickupSignature } from "@/lib/services/rentalAgreementService";

type RouteContext = {
  params: Promise<{ bookingId: string }>;
};

type RequestBody = {
  customerSignature?: string;
  adminWitnessSignature?: string;
};

export const POST = withAuth<RouteContext>(async (request, context, user) => {
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

  if (!body.customerSignature?.trim()) {
    return NextResponse.json({ error: "Customer signature is required." }, { status: 400 });
  }

  const agreement = await recordPickupSignature(
    bookingId,
    user.userId,
    body.customerSignature,
    body.adminWitnessSignature?.trim() || undefined,
  );

  return NextResponse.json({ agreement });
});
