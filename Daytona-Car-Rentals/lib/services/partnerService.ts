import "server-only";

import { FirebaseConfigError, listDocuments } from "@/lib/firebase/firestore";
import type { Booking, Partner, PartnerStats } from "@/types";

const PARTNER_CODE_PATTERN = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

function normalizePartnerCode(code: string) {
  return code.trim().toLowerCase();
}

function zeroedPartnerStats(partner: Partner): PartnerStats {
  return {
    partner,
    totalBookings: 0,
    last30DayBookings: 0,
    totalRevenueCents: 0,
  };
}

export async function getPartnerByCode(code: string): Promise<Partner | null> {
  const normalizedCode = normalizePartnerCode(code);

  if (!PARTNER_CODE_PATTERN.test(normalizedCode)) {
    return null;
  }

  try {
    const partners = await listDocuments<Partner>("partners", {
      filters: [
        { field: "code", operator: "==", value: normalizedCode },
        { field: "status", operator: "==", value: "active" },
      ],
      limit: 1,
    });

    return partners[0] ?? null;
  } catch (error) {
    if (error instanceof FirebaseConfigError) {
      return null;
    }

    console.error("[partner] Failed to load partner by code:", normalizedCode, error);
    return null;
  }
}

export async function listPartners(): Promise<Partner[]> {
  try {
    return await listDocuments<Partner>("partners", {
      orderBy: [{ field: "name", direction: "asc" }],
    });
  } catch (error) {
    if (error instanceof FirebaseConfigError) {
      return [];
    }

    console.error("[partner] Failed to list partners:", error);
    return [];
  }
}

export async function getPartnerStats(partner: Partner): Promise<PartnerStats> {
  try {
    const bookings = await listDocuments<Booking>("bookings", {
      filters: [{ field: "referralCode", operator: "==", value: partner.code }],
    });
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    return {
      partner,
      totalBookings: bookings.length,
      last30DayBookings: bookings.filter((booking) => booking.createdAt >= last30Days).length,
      totalRevenueCents: bookings.reduce((sum, booking) => sum + booking.pricing.totalAmount, 0),
    };
  } catch (error) {
    if (error instanceof FirebaseConfigError) {
      return zeroedPartnerStats(partner);
    }

    console.error("[partner] Failed to compute partner stats:", partner.code, error);
    return zeroedPartnerStats(partner);
  }
}
