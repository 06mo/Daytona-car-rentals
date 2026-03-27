import "server-only";

import type { AuditActorRole, Booking, BookingStatus, CreateBookingInput } from "@/types";
import { Timestamp } from "firebase-admin/firestore";

import { FirebaseConfigError, getDocument, listDocuments, requireDb, updateDocument } from "@/lib/firebase/firestore";
import { logAuditEvent } from "@/lib/services/auditService";
import {
  notifyBookingCancelledByAdmin,
  notifyBookingCancelledByCustomer,
  notifyBookingConfirmed,
  notifyBookingSubmitted,
} from "@/lib/services/notificationService";
import { getUserProfile, syncRepeatCustomerProfile } from "@/lib/services/userService";
import { checkVehicleAvailability, getDateRangeInDays } from "@/lib/utils/dateUtils";
import { getVehicleById } from "@/lib/services/vehicleService";

function getBookingCollectionPath() {
  return "bookings";
}

export async function createBooking(
  input: CreateBookingInput,
  actorId = "system",
  actorRole: AuditActorRole = "system",
) {
  const vehicle = await getVehicleById(input.vehicleId);

  if (!vehicle) {
    throw new Error("Vehicle not found.");
  }

  const totalDays = getDateRangeInDays(input.startDate, input.endDate);

  if (totalDays <= 0) {
    throw new Error("Booking dates must span at least one day.");
  }

  const now = new Date();
  const db = requireDb();
  const bookingReference = db.collection(getBookingCollectionPath()).doc();
  const activeStatuses: BookingStatus[] = ["pending_verification", "pending_payment", "confirmed", "active"];

  await db.runTransaction(async (transaction) => {
    const overlappingQuery = db
      .collection(getBookingCollectionPath())
      .where("vehicleId", "==", input.vehicleId)
      .where("startDate", "<", Timestamp.fromDate(input.endDate))
      .where("status", "in", activeStatuses)
      .orderBy("startDate", "asc");

    const overlappingSnapshot = await transaction.get(overlappingQuery);

    const hasConflict = overlappingSnapshot.docs.some((document) => {
      const booking = document.data() as {
        startDate: Timestamp;
        endDate: Timestamp;
      };

      return checkVehicleAvailability(
        { startDate: booking.startDate.toDate(), endDate: booking.endDate.toDate() },
        { startDate: input.startDate, endDate: input.endDate },
      );
    });

    if (hasConflict) {
      throw new Error("Vehicle is not available for the selected dates.");
    }

    transaction.set(bookingReference, {
      ...input,
      totalDays,
      pricing: {
        ...input.pricing,
        totalDays,
      },
      status: input.status ?? "pending_payment",
      paymentStatus: input.paymentStatus ?? "pending",
      createdAt: now,
      updatedAt: now,
    });
  });

  const booking = await getBookingById(bookingReference.id);

  if (booking) {
    void logAuditEvent({
      entityType: "booking",
      entityId: booking.id,
      action: "booking.created",
      actorId,
      actorRole,
      after: {
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        vehicleId: booking.vehicleId,
        startDate: booking.startDate,
        endDate: booking.endDate,
      },
      metadata: {
        vehicleId: booking.vehicleId,
        startDate: booking.startDate,
        endDate: booking.endDate,
      },
    });

    void (async () => {
      try {
        const customer = await getUserProfile(booking.userId);

        if (customer && vehicle) {
          await notifyBookingSubmitted(booking, customer, vehicle);
        }
      } catch (error) {
        console.error("[notification] Failed to queue booking submitted notification:", error);
      }
    })();
  }

  return booking;
}

export async function getBookingById(bookingId: string) {
  return getDocument<Booking>(`${getBookingCollectionPath()}/${bookingId}`);
}

export async function listBookingsForUser(userId: string) {
  return listDocuments<Booking>(getBookingCollectionPath(), {
    filters: [{ field: "userId", operator: "==", value: userId }],
    orderBy: [{ field: "createdAt", direction: "desc" }],
  });
}

export async function isVehicleAvailable(vehicleId: string, startDate: Date, endDate: Date) {
  const activeStatuses: BookingStatus[] = ["pending_verification", "pending_payment", "confirmed", "active"];

  const existingBookings = await listDocuments<Booking>(getBookingCollectionPath(), {
    filters: [
      { field: "vehicleId", operator: "==", value: vehicleId },
      { field: "startDate", operator: "<", value: endDate },
      { field: "status", operator: "in", value: activeStatuses },
    ],
    orderBy: [{ field: "startDate", direction: "asc" }],
  });

  return !existingBookings.some((booking) => {
    if (!activeStatuses.includes(booking.status)) {
      return false;
    }

    return checkVehicleAvailability(
      { startDate: booking.startDate, endDate: booking.endDate },
      { startDate, endDate },
    );
  });
}

export async function cancelBooking(
  bookingId: string,
  cancellationReason?: string,
  cancelledBy: "customer" | "admin" = "customer",
  actorId = "system",
  actorRole: AuditActorRole = "system",
) {
  const booking = await getBookingById(bookingId);

  if (!booking) {
    throw new Error("Booking not found.");
  }

  if (booking.status === "cancelled") {
    return booking;
  }

  if (booking.status === "active" || booking.status === "completed") {
    throw new Error("This booking can no longer be cancelled.");
  }

  const now = new Date();

  await updateDocument<Booking>(`${getBookingCollectionPath()}/${bookingId}`, {
    status: "cancelled",
    paymentStatus: booking.paymentStatus === "paid" ? "refunded" : booking.paymentStatus,
    cancellationReason,
    cancelledBy,
    cancelledAt: now,
    updatedAt: now,
  });

  const cancelledBooking = await getBookingById(bookingId);

  if (cancelledBooking) {
    void logAuditEvent({
      entityType: "booking",
      entityId: cancelledBooking.id,
      action: "booking.cancelled",
      actorId,
      actorRole,
      before: {
        status: booking.status,
        paymentStatus: booking.paymentStatus,
      },
      after: {
        status: cancelledBooking.status,
      },
      metadata: {
        cancelledBy,
        ...(cancellationReason ? { cancellationReason } : {}),
      },
    });

    void (async () => {
      try {
        const [customer, vehicle] = await Promise.all([
          getUserProfile(cancelledBooking.userId),
          getVehicleById(cancelledBooking.vehicleId),
        ]);

        if (!customer || !vehicle) {
          return;
        }

        if (cancelledBy === "admin") {
          await notifyBookingCancelledByAdmin(cancelledBooking, customer, vehicle);
          return;
        }

        await notifyBookingCancelledByCustomer(cancelledBooking, customer, vehicle);
      } catch (error) {
        console.error("[notification] Failed to queue booking cancelled notification:", error);
      }
    })();
  }

  return cancelledBooking;
}

export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus,
  adminNotes?: string,
  actorId = "system",
  actorRole: AuditActorRole = "system",
) {
  const booking = await getBookingById(bookingId);

  if (!booking) {
    throw new Error("Booking not found.");
  }

  await updateDocument<Booking>(`${getBookingCollectionPath()}/${bookingId}`, {
    status,
    adminNotes,
    updatedAt: new Date(),
    ...(status === "confirmed" ? { confirmedAt: new Date() } : {}),
    ...(status === "completed" ? { completedAt: new Date() } : {}),
  });

  const updatedBooking = await getBookingById(bookingId);

  if (updatedBooking && booking.status !== updatedBooking.status) {
    void logAuditEvent({
      entityType: "booking",
      entityId: updatedBooking.id,
      action: "booking.status_changed",
      actorId,
      actorRole,
      before: {
        status: booking.status,
      },
      after: {
        status: updatedBooking.status,
      },
      metadata: adminNotes ? { adminNotes } : undefined,
    });

    if (updatedBooking.status === "confirmed") {
      void (async () => {
        try {
          const [customer, vehicle] = await Promise.all([
            getUserProfile(updatedBooking.userId),
            getVehicleById(updatedBooking.vehicleId),
          ]);

          if (customer && vehicle) {
            await notifyBookingConfirmed(updatedBooking, customer, vehicle);
          }
        } catch (error) {
          console.error("[notification] Failed to queue booking confirmed notification:", error);
        }
      })();
    }

    if (updatedBooking.status === "completed") {
      void syncRepeatCustomerProfile(updatedBooking.userId);
    }
  }

  return updatedBooking;
}
