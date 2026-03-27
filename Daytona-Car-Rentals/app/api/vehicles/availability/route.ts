import { NextResponse } from "next/server";

import { FirebaseConfigError } from "@/lib/firebase/firestore";
import { listDocuments } from "@/lib/firebase/firestore";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/security/rateLimit";
import { isVehicleAvailable } from "@/lib/services/bookingService";
import type { Booking, BookingStatus } from "@/types";

type AvailabilityRequest = {
  vehicleId?: string;
  startDate?: string;
  endDate?: string;
};

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: Request) {
  try {
    const limitResponse = enforceRateLimit(request, rateLimitPolicies.availabilityLookup);

    if (limitResponse) {
      return limitResponse;
    }

    const body = (await request.json().catch(() => null)) as AvailabilityRequest | null;
    const vehicleId = body?.vehicleId;
    const startDate = body?.startDate;
    const endDate = body?.endDate;

    if (!startDate || !endDate) {
      return badRequest("startDate and endDate are required.");
    }

    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);

    if (Number.isNaN(parsedStartDate.getTime()) || Number.isNaN(parsedEndDate.getTime())) {
      return badRequest("startDate and endDate must be valid dates.");
    }

    if (parsedEndDate <= parsedStartDate) {
      return badRequest("endDate must be after startDate.");
    }

    if (vehicleId) {
      const available = await isVehicleAvailable(vehicleId, parsedStartDate, parsedEndDate);

      return NextResponse.json({ available });
    }

    const activeStatuses: BookingStatus[] = ["pending_verification", "pending_payment", "confirmed", "active"];
    const overlappingBookings = await listDocuments<Booking>("bookings", {
      filters: [
        { field: "startDate", operator: "<", value: parsedEndDate },
        { field: "status", operator: "in", value: activeStatuses },
      ],
      orderBy: [{ field: "startDate", direction: "asc" }],
    });

    const unavailableVehicleIds = overlappingBookings
      .filter((booking) => booking.endDate > parsedStartDate)
      .map((booking) => booking.vehicleId);

    return NextResponse.json({
      unavailableVehicleIds: Array.from(new Set(unavailableVehicleIds)),
    });
  } catch (error) {
    if (error instanceof FirebaseConfigError) {
      return NextResponse.json({ unavailableVehicleIds: [] });
    }

    return NextResponse.json({ error: "Unable to check availability." }, { status: 500 });
  }
}
