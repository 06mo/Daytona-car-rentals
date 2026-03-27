import { NextResponse } from "next/server";

import { withAuth } from "@/lib/middleware/withAuth";
import { computeRemainingBalance, listCustomerVisibleAdjustments } from "@/lib/services/adjustmentService";
import { getBookingById } from "@/lib/services/bookingService";

type RouteContext = {
  params: Promise<{ bookingId: string }>;
};

export const GET = withAuth<RouteContext>(async (_request, context, user) => {
  const { bookingId } = await context.params;
  const booking = await getBookingById(bookingId);

  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  if (booking.userId !== user.userId && user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const adjustments = await listCustomerVisibleAdjustments(bookingId);

  return NextResponse.json({
    adjustments,
    remainingBalance: computeRemainingBalance(booking, adjustments),
  });
});
