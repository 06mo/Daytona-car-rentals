import { NextResponse } from "next/server";

import { withAuth } from "@/lib/middleware/withAuth";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/security/rateLimit";
import { getBookingById } from "@/lib/services/bookingService";
import { recordConsent } from "@/lib/services/rentalAgreementService";

type RouteContext = {
  params: Promise<{ bookingId: string }>;
};

type RequestBody = {
  consentedAt?: string;
};

export const POST = withAuth<RouteContext>(async (request, context, user) => {
  const limitResponse = enforceRateLimit(request, rateLimitPolicies.bookingCreate, user.userId);

  if (limitResponse) {
    return limitResponse;
  }

  const { bookingId } = await context.params;
  const booking = await getBookingById(bookingId);

  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  if (booking.userId !== user.userId && user.role !== "admin") {
    return NextResponse.json({ error: "You do not have access to this booking." }, { status: 403 });
  }

  const body = (await request.json()) as RequestBody;
  const parsedConsentedAt =
    body.consentedAt && !Number.isNaN(new Date(body.consentedAt).getTime()) ? new Date(body.consentedAt) : undefined;

  const agreement = await recordConsent(bookingId, booking.userId, {
    consentedAt: parsedConsentedAt,
    actorId: user.userId,
    actorRole: user.role,
    consentIpHint: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined,
  });

  return NextResponse.json({ agreement });
});
