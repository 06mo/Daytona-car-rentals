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

    const { vehicleId, startDate, endDate } = (await request.json()) as AvailabilityRequest;

    if (!startDate || !endDate) {
      return badRequest("startDate and endDate are required.");
    }

    if (vehicleId) {
      const available = await isVehicleAvailable(vehicleId, new Date(startDate), new Date(endDate));

      return NextResponse.json({ available });
    }

    const activeStatuses: BookingStatus[] = ["pending_verification", "pending_payment", "confirmed", "active"];
    const overlappingBookings = await listDocuments<Booking>("bookings", {
      filters: [
        { field: "startDate", operator: "<", value: new Date(endDate) },
        { field: "status", operator: "in", value: activeStatuses },
      ],
      orderBy: [{ field: "startDate", direction: "asc" }],
    });

    const unavailableVehicleIds = overlappingBookings
      .filter((booking) => booking.endDate > new Date(startDate))
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
