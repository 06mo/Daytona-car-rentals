import "server-only";

import type { AuditActorRole, Booking, BookingStatus, CreateBookingInput } from "@/types";
import { Timestamp } from "firebase-admin/firestore";

import { FirebaseConfigError, getDocument, listDocuments, requireDb, updateDocument } from "@/lib/firebase/firestore";
import { logAuditEvent } from "@/lib/services/auditService";
import { assertBookingChannelCompliance } from "@/lib/services/channelComplianceService";
import { hasSubmittedChecklist } from "@/lib/services/checklistService";
import {
  notifyBookingCancelledByAdmin,
  notifyBookingCancelledByCustomer,
  notifyBookingConfirmed,
  notifyBookingSubmitted,
} from "@/lib/services/notificationService";
import { getUserProfile, syncRepeatCustomerProfile } from "@/lib/services/userService";
import { checkVehicleAvailability, getDateRangeInDays } from "@/lib/utils/dateUtils";
import { getVehicleById } from "@/lib/services/vehicleService";
import { evaluateBookingRisk } from "@/lib/services/riskEngine";
import { getPartnerById } from "@/lib/services/partnerService";

function getBookingCollectionPath() {
  return "bookings";
}

const availabilityBlockingStatuses: BookingStatus[] = [
  "pending_verification",
  "pending_payment",
  "payment_authorized",
  "insurance_pending",
  "insurance_manual_review",
  "insurance_cleared",
  "confirmed",
  "active",
];

function isLegacyPendingVerificationBooking(booking: Booking) {
  return (
    booking.status === "pending_verification" &&
    !booking.paymentAuthorizedAt &&
    !booking.coverageDecisionStatus &&
    !booking.insuranceVerificationStatus
  );
}

function canTransitionStatus(booking: Booking, nextStatus: BookingStatus) {
  const allowedTransitions: Record<BookingStatus, BookingStatus[]> = {
    pending_verification: ["confirmed", "cancelled"],
    pending_payment: ["payment_authorized", "cancelled", "payment_failed"],
    payment_authorized: ["insurance_pending", "insurance_manual_review", "cancelled"],
    insurance_pending: ["payment_authorized", "insurance_manual_review", "insurance_cleared", "cancelled"],
    insurance_manual_review: ["insurance_cleared", "cancelled"],
    insurance_cleared: ["confirmed", "cancelled"],
    confirmed: ["active", "cancelled"],
    active: ["completed"],
    completed: [],
    cancelled: [],
    payment_failed: [],
  };

  if (booking.status === "pending_verification" && nextStatus === "confirmed") {
    return isLegacyPendingVerificationBooking(booking);
  }

  return allowedTransitions[booking.status].includes(nextStatus);
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
  const partner = input.partnerId ? await getPartnerById(input.partnerId) : null;

  assertBookingChannelCompliance({
    rentalChannel: input.rentalChannel,
    partner,
    platformTripId: input.platformTripId,
  });

  const riskProfile = await evaluateBookingRisk({
    userId: input.userId,
    vehicle,
    startDate: input.startDate,
    endDate: input.endDate,
    protectionPackage: input.protectionPackage,
    pricingPromoCode: input.pricing.promoCode,
    stripeCustomerId: input.stripeCustomerId,
  });
  const db = requireDb();
  const bookingReference = db.collection(getBookingCollectionPath()).doc();
  await db.runTransaction(async (transaction) => {
    const overlappingQuery = db
      .collection(getBookingCollectionPath())
      .where("vehicleId", "==", input.vehicleId)
      .where("startDate", "<", Timestamp.fromDate(input.endDate))
      .where("status", "in", availabilityBlockingStatuses)
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

    const createdStatus = input.status ?? (riskProfile.reviewRequired ? "insurance_manual_review" : "payment_authorized");
    const paymentStatus = input.paymentStatus ?? "paid";
    const paymentAuthorizedAt =
      paymentStatus === "paid" && ["payment_authorized", "insurance_pending", "insurance_manual_review", "insurance_cleared", "confirmed", "active", "completed"].includes(createdStatus)
        ? (input.paymentAuthorizedAt ?? now)
        : input.paymentAuthorizedAt;

    transaction.set(bookingReference, {
      ...input,
      riskScore: riskProfile.score,
      riskLevel: riskProfile.level,
      riskFlags: riskProfile.flags,
      totalDays,
      pricing: {
        ...input.pricing,
        totalDays,
      },
      status: createdStatus,
      paymentStatus,
      paymentAuthorizedAt,
      rentalChannel: input.rentalChannel ?? "direct",
      coverageDecisionStatus: input.coverageDecisionStatus ?? (riskProfile.reviewRequired ? "manual_review" : undefined),
      coverageSource: input.coverageSource ?? "none",
      insuranceVerificationStatus: input.insuranceVerificationStatus ?? "unsubmitted",
      insuranceOverrideApplied: input.insuranceOverrideApplied ?? false,
      insuranceBlockingReasons:
        input.insuranceBlockingReasons ??
        (riskProfile.reviewRequired ? ["manual_review_required"] : []),
      adminNotes:
        createdStatus === "insurance_manual_review"
          ? [input.adminNotes, "Coverage review required before confirmation."].filter(Boolean).join(" ")
          : input.adminNotes,
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
        riskScore: booking.riskScore,
        riskLevel: booking.riskLevel,
        startDate: booking.startDate,
        endDate: booking.endDate,
      },
      metadata: {
        vehicleId: booking.vehicleId,
        riskFlags: booking.riskFlags,
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
  const existingBookings = await listDocuments<Booking>(getBookingCollectionPath(), {
    filters: [
      { field: "vehicleId", operator: "==", value: vehicleId },
      { field: "startDate", operator: "<", value: endDate },
      { field: "status", operator: "in", value: availabilityBlockingStatuses },
    ],
    orderBy: [{ field: "startDate", direction: "asc" }],
  });

  return !existingBookings.some((booking) => {
    if (!availabilityBlockingStatuses.includes(booking.status)) {
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

  if (booking.status === "confirmed" && status === "active") {
    if (!canTransitionStatus(booking, status)) {
      throw new Error("This booking cannot transition to the requested status.");
    }

    const pickupChecklistSubmitted = await hasSubmittedChecklist(bookingId, "pickup");

    if (!pickupChecklistSubmitted) {
      throw new Error("Pickup checklist must be submitted before marking booking active.");
    }
  }

  if (booking.status === "active" && status === "completed") {
    if (!canTransitionStatus(booking, status)) {
      throw new Error("This booking cannot transition to the requested status.");
    }

    const dropoffChecklistSubmitted = await hasSubmittedChecklist(bookingId, "dropoff");

    if (!dropoffChecklistSubmitted) {
      throw new Error("Dropoff checklist must be submitted before marking booking complete.");
    }
  }

  if (!canTransitionStatus(booking, status)) {
    throw new Error("This booking cannot transition to the requested status.");
  }

  await updateDocument<Booking>(`${getBookingCollectionPath()}/${bookingId}`, {
    status,
    adminNotes,
    updatedAt: new Date(),
    ...(status === "payment_authorized" && !booking.paymentAuthorizedAt ? { paymentAuthorizedAt: new Date() } : {}),
    ...(status === "insurance_manual_review" ? { insuranceReviewedAt: new Date() } : {}),
    ...(status === "insurance_cleared" ? { insuranceReviewedAt: new Date(), insuranceClearedAt: new Date() } : {}),
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
