import { NextResponse } from "next/server";

import { FirebaseConfigError } from "@/lib/firebase/firestore";
import { withAuth } from "@/lib/middleware/withAuth";
import { getBookingById } from "@/lib/services/bookingService";

type RouteContext = {
  params: Promise<{
    bookingId: string;
  }>;
};

export const GET = withAuth<RouteContext>(async (_request, context, user) => {
  try {
    const { bookingId } = await context.params;
    const booking = await getBookingById(bookingId);

    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    if (booking.userId !== user.userId && user.role !== "admin") {
      return NextResponse.json({ error: "You do not have access to this booking." }, { status: 403 });
    }

    return NextResponse.json({ booking });
  } catch (error) {
    if (error instanceof FirebaseConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    return NextResponse.json({ error: "Unable to load booking." }, { status: 500 });
  }
});
