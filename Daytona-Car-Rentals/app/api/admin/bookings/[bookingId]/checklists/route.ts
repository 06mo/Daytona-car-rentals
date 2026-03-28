import { NextResponse } from "next/server";

import { withAuth } from "@/lib/middleware/withAuth";
import { reportMonitoringEvent } from "@/lib/monitoring/monitoring";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/security/rateLimit";
import { getChecklist, upsertChecklist } from "@/lib/services/checklistService";
import { getBookingById } from "@/lib/services/bookingService";
import { recordPickupSignature } from "@/lib/services/rentalAgreementService";
import type { ChecklistStatus, ChecklistType, FuelLevel, UpsertVehicleChecklistInput } from "@/types";

type RequestContext = {
  params: Promise<{ bookingId: string }>;
};

type RequestBody = {
  type?: ChecklistType;
  fuelLevel?: FuelLevel;
  odometerMiles?: number;
  conditionNotes?: string;
  damageNoted?: boolean;
  damageDescription?: string;
  photoRefs?: string[];
  adminSignature?: string;
  customerSignature?: string;
  status?: ChecklistStatus;
};

export const POST = withAuth<RequestContext>(async (request, context, user) => {
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

  if (
    !body.type ||
    !body.fuelLevel ||
    typeof body.odometerMiles !== "number" ||
    body.damageNoted === undefined ||
    !body.status
  ) {
    return NextResponse.json({ error: "Missing required checklist fields." }, { status: 400 });
  }

  if (body.damageNoted && !body.damageDescription?.trim()) {
    return NextResponse.json({ error: "Damage description is required when damage is noted." }, { status: 400 });
  }

  if ((body.photoRefs?.length ?? 0) > 10) {
    return NextResponse.json({ error: "A checklist can include at most 10 photos." }, { status: 400 });
  }

  if (body.status === "submitted" && (!body.adminSignature || !body.customerSignature)) {
    return NextResponse.json({ error: "Both admin and customer signatures are required before submission." }, { status: 400 });
  }

  if (body.type === "pickup" && booking.status !== "confirmed") {
    return NextResponse.json({ error: "Pickup checklist can only be completed for confirmed bookings." }, { status: 409 });
  }

  if (body.type === "dropoff" && booking.status !== "active") {
    return NextResponse.json({ error: "Dropoff checklist can only be completed for active bookings." }, { status: 409 });
  }

  const existingChecklist = await getChecklist(bookingId, body.type);

  if (existingChecklist?.status === "submitted") {
    return NextResponse.json({ error: "Submitted checklists are read-only." }, { status: 409 });
  }

  const checklist = await upsertChecklist(
    booking,
    body.type,
    {
      fuelLevel: body.fuelLevel,
      odometerMiles: body.odometerMiles,
      conditionNotes: body.conditionNotes ?? "",
      damageNoted: body.damageNoted,
      damageDescription: body.damageDescription?.trim() || undefined,
      photoRefs: body.photoRefs ?? [],
      adminSignature: body.adminSignature,
      customerSignature: body.customerSignature,
      status: body.status,
    } satisfies UpsertVehicleChecklistInput,
    user.userId,
    user.role,
  );

  if (body.type === "pickup" && body.status === "submitted" && body.customerSignature) {
    try {
      await recordPickupSignature(booking.id, user.userId, body.customerSignature, body.adminSignature);
    } catch (error) {
      await reportMonitoringEvent({
        source: "api.admin.checklists",
        message: "Rental agreement pickup signature persistence failed after checklist submission.",
        severity: "error",
        error,
        context: {
          bookingId: booking.id,
          checklistType: body.type,
        },
      });
    }
  }

  return NextResponse.json({ checklist });
});
