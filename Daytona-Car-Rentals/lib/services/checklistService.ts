import "server-only";

import { mockBookings } from "@/lib/data/mockBookings";
import { FirebaseConfigError, getDocument, setDocument } from "@/lib/firebase/firestore";
import { logAuditEvent } from "@/lib/services/auditService";
import { updateBookingStatus } from "@/lib/services/bookingService";
import type { AuditActorRole, Booking, ChecklistType, UpsertVehicleChecklistInput, VehicleChecklist } from "@/types";

const mockChecklists: Record<string, Partial<Record<ChecklistType, VehicleChecklist>>> = {
  "booking-002": {
    pickup: {
      id: "pickup",
      bookingId: "booking-002",
      vehicleId: "ford-explorer-2024",
      type: "pickup",
      fuelLevel: "full",
      odometerMiles: 18240,
      conditionNotes: "Vehicle handed off clean with no visible new damage.",
      damageNoted: false,
      photoRefs: [],
      adminSignature: "data:,admin-signature",
      customerSignature: "data:,customer-signature",
      completedBy: "admin-demo",
      completedAt: new Date("2026-03-22T09:45:00.000Z"),
      status: "submitted",
      createdAt: new Date("2026-03-22T09:40:00.000Z"),
      updatedAt: new Date("2026-03-22T09:45:00.000Z"),
    },
  },
};

function getChecklistPath(bookingId: string, type: ChecklistType) {
  return `bookings/${bookingId}/checklists/${type}`;
}

export async function getChecklist(bookingId: string, type: ChecklistType) {
  try {
    return await getDocument<VehicleChecklist>(getChecklistPath(bookingId, type));
  } catch (error) {
    if (error instanceof FirebaseConfigError) {
      return mockChecklists[bookingId]?.[type] ?? null;
    }

    throw error;
  }
}

export async function hasSubmittedChecklist(bookingId: string, type: ChecklistType) {
  const checklist = await getChecklist(bookingId, type);
  return checklist?.status === "submitted";
}

export async function upsertChecklist(
  booking: Booking,
  type: ChecklistType,
  input: UpsertVehicleChecklistInput,
  actorId: string,
  actorRole: AuditActorRole,
) {
  const existing = await getChecklist(booking.id, type);
  const now = new Date();
  const nextChecklist: VehicleChecklist = {
    id: type,
    bookingId: booking.id,
    vehicleId: booking.vehicleId,
    type,
    fuelLevel: input.fuelLevel,
    odometerMiles: input.odometerMiles,
    conditionNotes: input.conditionNotes,
    damageNoted: input.damageNoted,
    damageDescription: input.damageDescription,
    photoRefs: input.photoRefs,
    adminSignature: input.adminSignature,
    customerSignature: input.customerSignature,
    completedBy: actorId,
    completedAt: now,
    status: input.status,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  try {
    await setDocument(getChecklistPath(booking.id, type), nextChecklist, { merge: true });
  } catch (error) {
    if (!(error instanceof FirebaseConfigError)) {
      throw error;
    }

    mockChecklists[booking.id] = {
      ...(mockChecklists[booking.id] ?? {}),
      [type]: nextChecklist,
    };
  }

  void logAuditEvent({
    entityType: "booking",
    entityId: booking.id,
    action: input.status === "submitted" ? "booking.checklist_submitted" : "booking.checklist_draft_saved",
    actorId,
    actorRole,
    metadata: {
      checklistType: type,
      status: input.status,
    },
  });

  if (input.status === "submitted") {
    await updateBookingStatus(
      booking.id,
      type === "pickup" ? "active" : "completed",
      undefined,
      actorId,
      actorRole,
    );

    void logAuditEvent({
      entityType: "booking",
      entityId: booking.id,
      action: type === "pickup" ? "booking.pickup_completed" : "booking.dropoff_completed",
      actorId,
      actorRole,
      metadata: {
        checklistType: type,
      },
    });
  }

  return getChecklist(booking.id, type);
}
