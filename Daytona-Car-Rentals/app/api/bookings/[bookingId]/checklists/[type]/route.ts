import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/middleware/withAuth";
import { getChecklist } from "@/lib/services/checklistService";
import { getBookingById } from "@/lib/services/bookingService";
import type { ChecklistType } from "@/types";

type RequestContext = {
  params: Promise<{ bookingId: string; type: string }>;
};

export async function GET(request: Request, context: RequestContext) {
  try {
    const user = await requireAuth(request);
    const { bookingId, type } = await context.params;
    const booking = await getBookingById(bookingId);

    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    if (booking.userId !== user.userId && user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const checklist = await getChecklist(bookingId, type as ChecklistType);

    if (!checklist || checklist.status !== "submitted") {
      return NextResponse.json({ checklist: null }, { status: 200 });
    }

    return NextResponse.json({ checklist });
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication required.") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Unable to load checklist." }, { status: 500 });
  }
}
