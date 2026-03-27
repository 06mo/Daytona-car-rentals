import "server-only";

import { mockBookings } from "@/lib/data/mockBookings";
import { FirebaseConfigError, getDocument, listDocuments, requireDb, runTransaction, updateDocument } from "@/lib/firebase/firestore";
import { logAuditEvent } from "@/lib/services/auditService";
import { getVehicleById } from "@/lib/services/vehicleService";
import type {
  AdjustmentStatus,
  AdjustmentType,
  AuditActorRole,
  Booking,
  BookingAdjustment,
  CreateBookingAdjustmentInput,
} from "@/types";

const mockAdjustments: Record<string, BookingAdjustment[]> = {};

function getAdjustmentCollectionPath(bookingId: string) {
  return `bookings/${bookingId}/adjustments`;
}

function getAdjustmentPath(bookingId: string, adjustmentId: string) {
  return `${getAdjustmentCollectionPath(bookingId)}/${adjustmentId}`;
}

function sortAdjustments(adjustments: BookingAdjustment[]) {
  return [...adjustments].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
}

function getInitialStatus(type: AdjustmentType, amountCents: number): AdjustmentStatus {
  if (type === "credit") {
    return "applied";
  }

  if (type === "correction" && amountCents < 0) {
    return "applied";
  }

  return amountCents > 0 ? "pending" : "applied";
}

function isAdjustmentAllowedForStatus(type: AdjustmentType, bookingStatus: Booking["status"]) {
  if (type === "extension") {
    return ["confirmed", "active"].includes(bookingStatus);
  }

  if (type === "fee") {
    return ["active", "completed"].includes(bookingStatus);
  }

  if (type === "credit") {
    return ["pending_verification", "pending_payment", "confirmed", "active", "completed"].includes(bookingStatus);
  }

  return ["pending_verification", "confirmed", "active"].includes(bookingStatus);
}

function updateMockBookingForExtension(bookingId: string, newEndDate: Date, additionalDays: number, amountCents: number) {
  const booking = mockBookings.find((entry) => entry.id === bookingId);

  if (!booking) {
    return;
  }

  booking.endDate = newEndDate;
  booking.totalDays += additionalDays;
  booking.updatedAt = new Date();
  booking.pricing = {
    ...booking.pricing,
    totalDays: booking.totalDays,
    totalAmount: booking.pricing.totalAmount + amountCents,
  };
}

export async function getAdjustment(bookingId: string, adjustmentId: string) {
  try {
    return await getDocument<BookingAdjustment>(getAdjustmentPath(bookingId, adjustmentId));
  } catch (error) {
    if (error instanceof FirebaseConfigError) {
      return mockAdjustments[bookingId]?.find((adjustment) => adjustment.id === adjustmentId) ?? null;
    }

    throw error;
  }
}

export async function listAdjustments(bookingId: string) {
  try {
    return await listDocuments<BookingAdjustment>(getAdjustmentCollectionPath(bookingId), {
      orderBy: [{ field: "createdAt", direction: "desc" }],
    });
  } catch (error) {
    if (error instanceof FirebaseConfigError) {
      return sortAdjustments(mockAdjustments[bookingId] ?? []);
    }

    throw error;
  }
}

export async function listCustomerVisibleAdjustments(bookingId: string) {
  const adjustments = await listAdjustments(bookingId);

  return adjustments.filter(
    (adjustment) =>
      Boolean(adjustment.customerVisibleNote) || adjustment.status === "pending" || adjustment.status === "paid",
  );
}

export function computeRemainingBalance(booking: Booking, adjustments: BookingAdjustment[]) {
  const adjustmentDelta = adjustments.reduce((total, adjustment) => {
    if (adjustment.amountCents > 0) {
      return ["pending", "applied", "paid"].includes(adjustment.status)
        ? total + adjustment.amountCents
        : total;
    }

    return ["applied", "paid"].includes(adjustment.status)
      ? total + adjustment.amountCents
      : total;
  }, 0);

  return booking.pricing.totalAmount - booking.pricing.depositAmount + adjustmentDelta;
}

export async function createAdjustment(
  booking: Booking,
  input: CreateBookingAdjustmentInput,
  actorId: string,
  actorRole: AuditActorRole,
) {
  if (!input.reason.trim()) {
    throw new Error("Adjustment reason is required.");
  }

  if (!isAdjustmentAllowedForStatus(input.type, booking.status)) {
    throw new Error(`A ${input.type} adjustment is not allowed while the booking is ${booking.status}.`);
  }

  const now = new Date();
  let amountCents = input.amountCents ?? 0;
  let extensionDetails: BookingAdjustment["extensionDetails"];

  if (input.type === "fee" && amountCents <= 0) {
    throw new Error("Fee adjustments must be greater than zero.");
  }

  if (input.type === "credit" && amountCents >= 0) {
    throw new Error("Credit adjustments must be less than zero.");
  }

  if (input.type === "correction" && amountCents === 0) {
    throw new Error("Correction adjustments must change the balance.");
  }

  if (input.type === "extension") {
    if (!input.newEndDate) {
      throw new Error("A new end date is required for extension adjustments.");
    }

    if (Number.isNaN(input.newEndDate.getTime())) {
      throw new Error("Extension end date is invalid.");
    }

    if (input.newEndDate <= booking.endDate) {
      throw new Error("Extension end date must be later than the current booking end date.");
    }

    const vehicle = await getVehicleById(booking.vehicleId);

    if (!vehicle) {
      throw new Error("Vehicle not found for extension pricing.");
    }

    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    const additionalDays = Math.ceil((input.newEndDate.getTime() - booking.endDate.getTime()) / millisecondsPerDay);

    if (additionalDays <= 0) {
      throw new Error("Extension must add at least one day.");
    }

    amountCents = vehicle.dailyRate * additionalDays;
    extensionDetails = {
      originalEndDate: booking.endDate,
      newEndDate: input.newEndDate,
      additionalDays,
      dailyRate: vehicle.dailyRate,
    };
  }

  if (!Number.isFinite(amountCents)) {
    throw new Error("Adjustment amount is invalid.");
  }

  const nextAdjustmentBase = {
    bookingId: booking.id,
    type: input.type,
    amountCents,
    reason: input.reason.trim(),
    customerVisibleNote: input.customerVisibleNote?.trim() || undefined,
    status: getInitialStatus(input.type, amountCents),
    extensionDetails,
    createdBy: actorId,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const db = requireDb();
    const adjustmentReference = db.collection(getAdjustmentCollectionPath(booking.id)).doc();
    const nextAdjustment: BookingAdjustment = {
      id: adjustmentReference.id,
      ...nextAdjustmentBase,
    };

    await runTransaction(async (transaction) => {
      transaction.set(adjustmentReference, nextAdjustment);

      if (extensionDetails) {
        transaction.update(db.doc(`bookings/${booking.id}`), {
          endDate: extensionDetails.newEndDate,
          totalDays: booking.totalDays + extensionDetails.additionalDays,
          updatedAt: now,
          pricing: {
            ...booking.pricing,
            totalDays: booking.totalDays + extensionDetails.additionalDays,
            totalAmount: booking.pricing.totalAmount + amountCents,
          },
        });
      }
    });

    void logAuditEvent({
      entityType: "booking",
      entityId: booking.id,
      action: "booking_adjustment_created",
      actorId,
      actorRole,
      metadata: {
        adjustmentId: nextAdjustment.id,
        adjustmentType: nextAdjustment.type,
        amountCents: nextAdjustment.amountCents,
        status: nextAdjustment.status,
      },
    });

    if (extensionDetails) {
      void logAuditEvent({
        entityType: "booking",
        entityId: booking.id,
        action: "booking_extended",
        actorId,
        actorRole,
        metadata: {
          adjustmentId: nextAdjustment.id,
          newEndDate: extensionDetails.newEndDate,
          additionalDays: extensionDetails.additionalDays,
          amountCents,
        },
      });
    }

    return nextAdjustment;
  } catch (error) {
    if (!(error instanceof FirebaseConfigError)) {
      throw error;
    }

    const mockAdjustment: BookingAdjustment = {
      id: `adj-${Date.now()}`,
      ...nextAdjustmentBase,
    };
    mockAdjustments[booking.id] = sortAdjustments([mockAdjustment, ...(mockAdjustments[booking.id] ?? [])]);

    if (extensionDetails) {
      updateMockBookingForExtension(booking.id, extensionDetails.newEndDate, extensionDetails.additionalDays, amountCents);
    }

    return mockAdjustment;
  }
}

export async function waiveAdjustment(bookingId: string, adjustmentId: string, actorId: string, actorRole: AuditActorRole) {
  const adjustment = await getAdjustment(bookingId, adjustmentId);

  if (!adjustment) {
    throw new Error("Adjustment not found.");
  }

  if (adjustment.status !== "pending") {
    throw new Error("Only pending adjustments can be waived.");
  }

  const now = new Date();
  const nextValues: Partial<BookingAdjustment> = {
    status: "waived",
    waivedAt: now,
    waivedBy: actorId,
    updatedAt: now,
  };

  try {
    await updateDocument<BookingAdjustment>(getAdjustmentPath(bookingId, adjustmentId), nextValues);
  } catch (error) {
    if (!(error instanceof FirebaseConfigError)) {
      throw error;
    }

    mockAdjustments[bookingId] = (mockAdjustments[bookingId] ?? []).map((entry) =>
      entry.id === adjustmentId ? { ...entry, ...nextValues } as BookingAdjustment : entry,
    );
  }

  void logAuditEvent({
    entityType: "booking",
    entityId: bookingId,
    action: "booking_adjustment_waived",
    actorId,
    actorRole,
    metadata: {
      adjustmentId,
      amountCents: adjustment.amountCents,
      adjustmentType: adjustment.type,
    },
  });

  return getAdjustment(bookingId, adjustmentId);
}

export async function markAdjustmentPaymentRequested(
  bookingId: string,
  adjustmentId: string,
  paymentLinkUrl: string,
  actorId: string,
  actorRole: AuditActorRole,
) {
  const adjustment = await getAdjustment(bookingId, adjustmentId);

  if (!adjustment) {
    throw new Error("Adjustment not found.");
  }

  if (adjustment.status !== "pending") {
    throw new Error("Only pending adjustments can be requested for payment.");
  }

  const nextValues: Partial<BookingAdjustment> = {
    stripePaymentLinkUrl: paymentLinkUrl,
    updatedAt: new Date(),
  };

  try {
    await updateDocument<BookingAdjustment>(getAdjustmentPath(bookingId, adjustmentId), nextValues);
  } catch (error) {
    if (!(error instanceof FirebaseConfigError)) {
      throw error;
    }

    mockAdjustments[bookingId] = (mockAdjustments[bookingId] ?? []).map((entry) =>
      entry.id === adjustmentId ? { ...entry, ...nextValues } as BookingAdjustment : entry,
    );
  }

  void logAuditEvent({
    entityType: "booking",
    entityId: bookingId,
    action: "adjustment_payment_requested",
    actorId,
    actorRole,
    metadata: {
      adjustmentId,
      amountCents: adjustment.amountCents,
      adjustmentType: adjustment.type,
    },
  });

  return getAdjustment(bookingId, adjustmentId);
}

export async function markAdjustmentPaid(bookingId: string, adjustmentId: string, stripePaymentIntentId?: string | null) {
  const adjustment = await getAdjustment(bookingId, adjustmentId);

  if (!adjustment) {
    throw new Error("Adjustment not found.");
  }

  if (adjustment.status === "paid") {
    return adjustment;
  }

  const nextValues: Partial<BookingAdjustment> = {
    status: "paid",
    paidAt: new Date(),
    updatedAt: new Date(),
    stripePaymentIntentId: stripePaymentIntentId ?? adjustment.stripePaymentIntentId,
  };

  try {
    await updateDocument<BookingAdjustment>(getAdjustmentPath(bookingId, adjustmentId), nextValues);
  } catch (error) {
    if (!(error instanceof FirebaseConfigError)) {
      throw error;
    }

    mockAdjustments[bookingId] = (mockAdjustments[bookingId] ?? []).map((entry) =>
      entry.id === adjustmentId ? { ...entry, ...nextValues } as BookingAdjustment : entry,
    );
  }

  void logAuditEvent({
    entityType: "booking",
    entityId: bookingId,
    action: "adjustment_payment_received",
    actorId: "system",
    actorRole: "system",
    metadata: {
      adjustmentId,
      amountCents: adjustment.amountCents,
      adjustmentType: adjustment.type,
      stripePaymentIntentId: stripePaymentIntentId ?? null,
    },
  });

  return getAdjustment(bookingId, adjustmentId);
}
