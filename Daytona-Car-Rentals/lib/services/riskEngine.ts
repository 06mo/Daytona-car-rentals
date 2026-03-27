import "server-only";

import type {
  Booking,
  BookingRiskProfile,
  ProtectionPackageId,
  RiskAssessment,
  RiskLevel,
  UserDocument,
  UserProfile,
  Vehicle,
} from "@/types";

import { mockBookings } from "@/lib/data/mockBookings";
import { FirebaseConfigError, listDocuments } from "@/lib/firebase/firestore";
import { getUserDocument } from "@/lib/services/documentService";
import { getUserProfile } from "@/lib/services/userService";

type ComputeRiskScoreInput = {
  bookingHistory: Booking[];
  customer: UserProfile | null;
  driversLicenseDocument: UserDocument | null;
  endDate: Date;
  insuranceDocument: UserDocument | null;
  pricingPromoCode?: string;
  protectionPackage: ProtectionPackageId;
  startDate: Date;
  stripeCustomerId?: string;
  vehicle: Vehicle;
};

type EvaluateBookingRiskInput = {
  endDate: Date;
  pricingPromoCode?: string;
  protectionPackage: ProtectionPackageId;
  startDate: Date;
  stripeCustomerId?: string;
  userId: string;
  vehicle: Vehicle;
};

const riskLevels: Array<{ level: RiskLevel; minScore: number }> = [
  { level: "high", minScore: 70 },
  { level: "medium", minScore: 35 },
  { level: "low", minScore: 0 },
];

function daysUntil(date: Date) {
  return Math.floor((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function getAgeOnDate(dateOfBirth: string | undefined, targetDate: Date) {
  if (!dateOfBirth) {
    return null;
  }

  const dob = new Date(dateOfBirth);

  if (Number.isNaN(dob.getTime())) {
    return null;
  }

  let age = targetDate.getFullYear() - dob.getFullYear();
  const monthDelta = targetDate.getMonth() - dob.getMonth();

  if (monthDelta < 0 || (monthDelta === 0 && targetDate.getDate() < dob.getDate())) {
    age -= 1;
  }

  return age;
}

function normalizeScore(score: number) {
  return Math.max(0, Math.min(100, score));
}

function resolveRiskLevel(score: number): RiskLevel {
  return riskLevels.find((entry) => score >= entry.minScore)?.level ?? "low";
}

export function getAllowedProtectionPackagesForRisk(level: RiskLevel): ProtectionPackageId[] {
  if (level === "high") {
    return ["premium"];
  }

  if (level === "medium") {
    return ["standard", "premium"];
  }

  return ["basic", "standard", "premium"];
}

export function computeRiskScore(input: ComputeRiskScoreInput): RiskAssessment {
  const flags = new Set<string>();
  let score = 0;

  const age = getAgeOnDate(input.customer?.dateOfBirth, input.startDate);

  if (age === null) {
    score += 15;
    flags.add("missing_or_invalid_dob");
  } else if (age < 21) {
    score += 35;
    flags.add("under_21_driver");
  } else if (age < 25) {
    score += 18;
    flags.add("young_driver");
  } else if (age >= 75) {
    score += 10;
    flags.add("senior_driver_review");
  }

  if (!input.driversLicenseDocument) {
    score += 30;
    flags.add("missing_license");
  } else if (input.driversLicenseDocument.status === "pending") {
    score += 12;
    flags.add("license_pending_review");
  } else if (input.driversLicenseDocument.status === "rejected") {
    score += 40;
    flags.add("license_rejected");
  }

  if (input.protectionPackage === "basic") {
    if (!input.insuranceDocument) {
      score += 35;
      flags.add("missing_insurance_for_basic");
    } else if (input.insuranceDocument.status === "pending") {
      score += 8;
      flags.add("insurance_pending_review");
    } else if (input.insuranceDocument.status === "rejected") {
      score += 40;
      flags.add("insurance_rejected");
    }
  } else if (input.insuranceDocument?.status === "rejected") {
    score += 5;
    flags.add("insurance_rejected_on_file");
  }

  const leadDays = daysUntil(input.startDate);
  const tripDays = Math.max(1, Math.ceil((input.endDate.getTime() - input.startDate.getTime()) / (1000 * 60 * 60 * 24)));

  if (leadDays < 1) {
    score += 18;
    flags.add("same_day_booking");
  } else if (leadDays < 3) {
    score += 10;
    flags.add("last_minute_booking");
  }

  if (tripDays > 21) {
    score += 10;
    flags.add("long_duration_booking");
  }

  if (input.vehicle.category === "luxury" || input.vehicle.category === "convertible") {
    score += 15;
    flags.add("high_value_vehicle");
  } else if (input.vehicle.category === "suv" || input.vehicle.category === "truck" || input.vehicle.category === "van") {
    score += 6;
    flags.add("large_vehicle");
  }

  const completedBookings = input.bookingHistory.filter((booking) => booking.status === "completed").length;
  const cancelledBookings = input.bookingHistory.filter((booking) => booking.status === "cancelled").length;
  const failedPayments = input.bookingHistory.filter((booking) => booking.paymentStatus === "failed").length;

  if (completedBookings === 0) {
    score += 10;
    flags.add("first_time_customer");
  } else if (completedBookings >= 3) {
    score -= 15;
    flags.add("loyal_repeat_customer");
  } else if (completedBookings >= 1) {
    score -= 8;
    flags.add("repeat_customer");
  }

  if (cancelledBookings >= 2) {
    score += 12;
    flags.add("cancellation_history");
  }

  if (failedPayments > 0) {
    score += 18;
    flags.add("payment_failure_history");
  }

  if (!input.stripeCustomerId) {
    score += 8;
    flags.add("no_saved_payment_profile");
  }

  if (input.pricingPromoCode && completedBookings === 0) {
    score += 5;
    flags.add("promo_on_first_booking");
  }

  if (input.customer?.verificationStatus === "pending") {
    score += 8;
    flags.add("profile_pending_verification");
  } else if (input.customer?.verificationStatus === "rejected") {
    score += 20;
    flags.add("profile_rejected");
  } else if (input.customer?.verificationStatus === "verified") {
    score -= 5;
    flags.add("profile_verified");
  }

  const normalizedScore = normalizeScore(score);

  return {
    score: normalizedScore,
    level: resolveRiskLevel(normalizedScore),
    flags: Array.from(flags),
  };
}

export async function evaluateBookingRisk(input: EvaluateBookingRiskInput): Promise<BookingRiskProfile> {
  const [customer, driversLicenseDocument, insuranceDocument, bookingHistory] = await Promise.all([
    getUserProfile(input.userId),
    getUserDocument(input.userId, "drivers_license"),
    getUserDocument(input.userId, "insurance_card"),
    listDocuments<Booking>("bookings", {
      filters: [{ field: "userId", operator: "==", value: input.userId }],
      orderBy: [{ field: "createdAt", direction: "desc" }],
    }).catch((error) => {
      if (error instanceof FirebaseConfigError) {
        return mockBookings.filter((booking) => booking.userId === input.userId);
      }

      throw error;
    }),
  ]);

  const assessment = computeRiskScore({
    bookingHistory,
    customer,
    driversLicenseDocument,
    endDate: input.endDate,
    insuranceDocument,
    pricingPromoCode: input.pricingPromoCode,
    protectionPackage: input.protectionPackage,
    startDate: input.startDate,
    stripeCustomerId: input.stripeCustomerId,
    vehicle: input.vehicle,
  });

  return {
    ...assessment,
    allowedProtectionPackages: getAllowedProtectionPackagesForRisk(assessment.level),
    reviewRequired: assessment.level === "high",
  };
}
