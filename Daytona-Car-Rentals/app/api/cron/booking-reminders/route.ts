import { NextResponse } from "next/server";

import { FirebaseConfigError, listDocuments } from "@/lib/firebase/firestore";
import { reportMonitoringEvent } from "@/lib/monitoring/monitoring";
import { notifyPickupReminder, notifyReturnReminder } from "@/lib/services/notificationService";
import { getUserProfile } from "@/lib/services/userService";
import { getVehicleById } from "@/lib/services/vehicleService";
import type { Booking } from "@/types";

export async function GET(request: Request) {
  const expectedSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!expectedSecret || authorization !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const { tomorrowStart, tomorrowEnd } = getTomorrowUtcRange();

    const pickupBookings = await listDocuments<Booking>("bookings", {
      filters: [
        { field: "startDate", operator: ">=", value: tomorrowStart },
        { field: "startDate", operator: "<", value: tomorrowEnd },
        { field: "status", operator: "in", value: ["confirmed", "active"] },
      ],
    });

    const returnBookings = await listDocuments<Booking>("bookings", {
      filters: [
        { field: "endDate", operator: ">=", value: tomorrowStart },
        { field: "endDate", operator: "<", value: tomorrowEnd },
        { field: "status", operator: "==", value: "active" },
      ],
    });

    for (const booking of pickupBookings) {
      const customer = await getUserProfile(booking.userId);
      const vehicle = await getVehicleById(booking.vehicleId);

      if (customer && vehicle) {
        await notifyPickupReminder(booking, customer, vehicle);
      }
    }

    for (const booking of returnBookings) {
      const customer = await getUserProfile(booking.userId);
      const vehicle = await getVehicleById(booking.vehicleId);

      if (customer && vehicle) {
        await notifyReturnReminder(booking, customer, vehicle);
      }
    }

    return NextResponse.json({
      pickupReminders: pickupBookings.length,
      returnReminders: returnBookings.length,
    });
  } catch (error) {
    await reportMonitoringEvent({
      source: "api.cron.booking_reminders",
      message: "Reminder cron run failed.",
      severity: error instanceof FirebaseConfigError ? "warning" : "error",
      error,
      context: {
        method: request.method,
        path: "/api/cron/booking-reminders",
      },
      alert: !(error instanceof FirebaseConfigError),
    });

    if (error instanceof FirebaseConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: "Unable to process reminders." }, { status: 500 });
  }
}

function getTomorrowUtcRange() {
  const now = new Date();
  const tomorrowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
  const tomorrowEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 2, 0, 0, 0, 0));

  return { tomorrowStart, tomorrowEnd };
}
