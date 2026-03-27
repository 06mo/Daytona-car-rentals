import { NextResponse } from "next/server";

import { withAuth } from "@/lib/middleware/withAuth";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/security/rateLimit";
import { createAdjustment, computeRemainingBalance, listAdjustments, markAdjustmentPaymentRequested } from "@/lib/services/adjustmentService";
import { getBookingById } from "@/lib/services/bookingService";
import { notifyAdjustmentPaymentRequired } from "@/lib/services/notificationService";
import { createCheckoutSessionForAdjustment } from "@/lib/stripe/server";
import { getUserProfile } from "@/lib/services/userService";
import type { AdjustmentType } from "@/types";

type RouteContext = {
  params: Promise<{ bookingId: string }>;
};

type RequestBody = {
  type?: AdjustmentType;
  amountCents?: number;
  reason?: string;
  customerVisibleNote?: string;
  newEndDate?: string;
  requestPaymentNow?: boolean;
};

export const GET = withAuth<RouteContext>(async (_request, context, user) => {
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { bookingId } = await context.params;
  const booking = await getBookingById(bookingId);

  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  const adjustments = await listAdjustments(bookingId);

  return NextResponse.json({
    adjustments,
    remainingBalance: computeRemainingBalance(booking, adjustments),
  });
});

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

  if (!body.type || !body.reason?.trim()) {
    return NextResponse.json({ error: "Type and reason are required." }, { status: 400 });
  }

  const adjustment = await createAdjustment(
    booking,
    {
      type: body.type,
      amountCents: body.amountCents,
      reason: body.reason,
      customerVisibleNote: body.customerVisibleNote,
      newEndDate: body.newEndDate ? new Date(body.newEndDate) : undefined,
    },
    user.userId,
    user.role,
  );

  let nextAdjustment = adjustment;

  if (body.requestPaymentNow && adjustment.status === "pending") {
    const customer = await getUserProfile(booking.userId);
    const session = await createCheckoutSessionForAdjustment({
      adjustment,
      booking,
      customerEmail: customer?.email ?? null,
    });

    if (!session.url) {
      return NextResponse.json({ error: "Stripe did not return a checkout URL." }, { status: 503 });
    }

    nextAdjustment = (await markAdjustmentPaymentRequested(
      booking.id,
      adjustment.id,
      session.url,
      user.userId,
      user.role,
    )) ?? adjustment;

    if (customer) {
      await notifyAdjustmentPaymentRequired(booking, nextAdjustment, customer);
    }
  }

  return NextResponse.json({ adjustment: nextAdjustment }, { status: 201 });
});
