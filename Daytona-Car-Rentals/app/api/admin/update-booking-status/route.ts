import { NextResponse } from "next/server";

import { withAuth } from "@/lib/middleware/withAuth";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/security/rateLimit";
import { canTransitionBooking } from "@/lib/services/adminService";
import { getBookingById, updateBookingStatus } from "@/lib/services/bookingService";

type RequestBody = {
  status?: "confirmed" | "active" | "completed";
};

export const POST = withAuth(async (request, _context, user) => {
  const limitResponse = enforceRateLimit(request, rateLimitPolicies.adminMutation, user.userId);

  if (limitResponse) {
    return limitResponse;
  }

  if (user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { bookingId, status } = (await request.json()) as RequestBody & { bookingId?: string };

  if (!bookingId || !status) {
    return NextResponse.json({ error: "bookingId and status are required." }, { status: 400 });
  }

  const booking = await getBookingById(bookingId);

  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  if (!canTransitionBooking(booking, status)) {
    return NextResponse.json({ error: "This booking cannot transition to the requested status." }, { status: 409 });
  }

  const updatedBooking = await updateBookingStatus(bookingId, status, undefined, user.userId, user.role);
  return NextResponse.json({ booking: updatedBooking });
});
