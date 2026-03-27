import "server-only";

import { mockBookings } from "@/lib/data/mockBookings";
import { mockUsers } from "@/lib/data/mockUsers";
import { mockVehicles } from "@/lib/data/mockVehicles";
import { FirebaseConfigError, listDocuments } from "@/lib/firebase/firestore";
import { getAnalyticsDashboardSummary } from "@/lib/services/analyticsService";
import { listUserDocuments } from "@/lib/services/documentService";
import type { Booking, BookingStatus, UserDocument, UserProfile, Vehicle } from "@/types";

export async function listAdminBookings() {
  try {
    return await listDocuments<Booking>("bookings", {
      orderBy: [{ field: "createdAt", direction: "desc" }],
    });
  } catch (error) {
    if (!(error instanceof FirebaseConfigError)) {
      throw error;
    }

    return mockBookings;
  }
}

export async function listAdminUsers() {
  try {
    return await listDocuments<UserProfile>("users", {
      orderBy: [{ field: "createdAt", direction: "desc" }],
    });
  } catch (error) {
    if (!(error instanceof FirebaseConfigError)) {
      throw error;
    }

    return mockUsers;
  }
}

export async function listAdminVehicles() {
  try {
    return await listDocuments<Vehicle>("vehicles", {
      orderBy: [{ field: "createdAt", direction: "desc" }],
    });
  } catch (error) {
    if (!(error instanceof FirebaseConfigError)) {
      throw error;
    }

    return mockVehicles;
  }
}

export async function listUserDocumentsForAdmin(userId: string) {
  return listUserDocuments(userId);
}

export async function getAdminDashboardData() {
  const [bookings, users, vehicles] = await Promise.all([
    listAdminBookings(),
    listAdminUsers(),
    listAdminVehicles(),
  ]);
  const analytics = await getAnalyticsDashboardSummary();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const monthlyBookings = bookings.filter((booking) => booking.createdAt >= monthStart);
  const monthlyRevenue = monthlyBookings
    .filter((booking) => booking.paymentStatus === "paid")
    .reduce((sum, booking) => sum + booking.pricing.totalAmount, 0);

  const pendingVerifications = users.filter((user) => user.verificationStatus === "pending").length;
  const activeRentals = bookings.filter((booking) => booking.status === "active").length;

  const last30Days = Array.from({ length: 30 }).map((_, index) => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - (29 - index));
    const dayLabel = day.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const revenue = bookings
      .filter((booking) => booking.paymentStatus === "paid")
      .filter((booking) => booking.createdAt.toDateString() === day.toDateString())
      .reduce((sum, booking) => sum + booking.pricing.totalAmount, 0);

    return {
      date: dayLabel,
      revenue: revenue / 100,
    };
  });

  const bookingsWithContext = monthlyBookings
    .slice(0, 10)
    .map((booking) => ({
      booking,
      customer: users.find((user) => user.id === booking.userId) ?? null,
      vehicle: vehicles.find((vehicle) => vehicle.id === booking.vehicleId) ?? null,
    }));

  return {
    stats: {
      totalBookings: monthlyBookings.length,
      monthlyRevenue: monthlyRevenue / 100,
      pendingVerifications,
      activeRentals,
      pageViews: analytics.pageViews,
      bookingConversionRate: analytics.bookingConversionRate,
    },
    bookingsWithContext,
    revenueSeries: last30Days,
    analytics,
  };
}

export function getBookingTimeline(booking: Booking) {
  return [
    { label: "Booking Created", time: booking.createdAt },
    ...(booking.paymentAuthorizedAt ? [{ label: "Payment Authorized", time: booking.paymentAuthorizedAt }] : []),
    ...(booking.insuranceReviewedAt ? [{ label: "Insurance Reviewed", time: booking.insuranceReviewedAt }] : []),
    ...(booking.insuranceClearedAt ? [{ label: "Insurance Cleared", time: booking.insuranceClearedAt }] : []),
    ...(booking.confirmedAt ? [{ label: "Confirmed", time: booking.confirmedAt }] : []),
    ...(booking.completedAt ? [{ label: "Completed", time: booking.completedAt }] : []),
    ...(booking.cancelledAt ? [{ label: "Cancelled", time: booking.cancelledAt }] : []),
  ];
}

export function canTransitionBooking(booking: Booking, nextStatus: BookingStatus) {
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
    return !booking.paymentAuthorizedAt && !booking.coverageDecisionStatus && !booking.insuranceVerificationStatus;
  }

  return allowedTransitions[booking.status].includes(nextStatus);
}
