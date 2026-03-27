import { NextResponse } from "next/server";

import { FirebaseConfigError } from "@/lib/firebase/firestore";
import { listDocuments } from "@/lib/firebase/firestore";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/security/rateLimit";
import { isVehicleAvailable } from "@/lib/services/bookingService";
import { reportMonitoringEvent } from "@/lib/monitoring/monitoring";
import { checkVehicleAvailability } from "@/lib/utils/dateUtils";
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

    const activeStatuses: BookingStatus[] = [
      "pending_verification",
      "pending_payment",
      "payment_authorized",
      "insurance_pending",
      "insurance_manual_review",
      "insurance_cleared",
      "confirmed",
      "active",
    ];
    const overlappingBookings = await listDocuments<Booking>("bookings", {
      filters: [{ field: "status", operator: "in", value: activeStatuses }],
    });

    const unavailableVehicleIds = overlappingBookings
      .filter((booking) =>
        checkVehicleAvailability(
          { startDate: booking.startDate, endDate: booking.endDate },
          { startDate: parsedStartDate, endDate: parsedEndDate },
        ),
      )
      .map((booking) => booking.vehicleId);

    return NextResponse.json({
      unavailableVehicleIds: Array.from(new Set(unavailableVehicleIds)),
    });
  } catch (error) {
    await reportMonitoringEvent({
      source: "api.vehicles.availability",
      message: "Vehicle availability lookup failed.",
      severity: error instanceof FirebaseConfigError ? "warning" : "error",
      error,
      context: {
        method: request.method,
        path: "/api/vehicles/availability",
      },
      alert: !(error instanceof FirebaseConfigError),
    });

    if (error instanceof FirebaseConfigError) {
      return NextResponse.json({ unavailableVehicleIds: [] });
    }

    return NextResponse.json({ error: "Unable to check availability." }, { status: 500 });
  }
}
