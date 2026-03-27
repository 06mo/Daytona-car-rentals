import { NextResponse } from "next/server";

import { FirebaseConfigError } from "@/lib/firebase/firestore";
import { requireAuth } from "@/lib/middleware/withAuth";
import { listBookingsForUser } from "@/lib/services/bookingService";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const bookings = await listBookingsForUser(user.userId);

    return NextResponse.json({ bookings });
  } catch (error) {
    if (error instanceof FirebaseConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    if (error instanceof Error && error.message === "Authentication required.") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json({ error: "Unable to load bookings." }, { status: 500 });
  }
}
