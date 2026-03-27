import "server-only";

import type { Booking, Partner, RentalChannel } from "@/types";

export type ChannelComplianceContext = {
  rentalChannel?: RentalChannel;
  partner?: Partner | null;
  platformTripId?: string;
};

export function normalizeRentalChannel(channel?: RentalChannel | null): RentalChannel {
  return channel ?? "direct";
}

export function getChannelComplianceIssues(context: ChannelComplianceContext): string[] {
  const rentalChannel = normalizeRentalChannel(context.rentalChannel);
  const issues: string[] = [];

  if (rentalChannel === "platform") {
    if (!context.platformTripId?.trim()) {
      issues.push("Platform bookings require an external trip ID.");
    }

    if (!context.partner || context.partner.status !== "active") {
      issues.push("Platform bookings require an active linked platform partner.");
    }
  }

  if (rentalChannel === "partner") {
    if (!context.partner || context.partner.status !== "active") {
      issues.push("Partner bookings require an active partner record.");
    } else if (!context.partner.coverageResponsibility) {
      issues.push("Partner bookings require declared coverage responsibility.");
    }
  }

  return issues;
}

export function assertBookingChannelCompliance(context: ChannelComplianceContext) {
  const issues = getChannelComplianceIssues(context);

  if (issues.length > 0) {
    throw new Error(issues[0]);
  }
}

export function getAdminChannelMetadata(
  booking: Booking,
  partner: Partner | null,
) {
  const rentalChannel = normalizeRentalChannel(booking.rentalChannel);
  const complianceIssues = getChannelComplianceIssues({
    rentalChannel,
    partner,
    platformTripId: booking.platformTripId,
  });

  return {
    rentalChannel,
    coverageSource: booking.coverageSource ?? "none",
    platformTripId: booking.platformTripId?.trim() || null,
    referralCode: booking.referralCode?.trim() || null,
    partnerName: partner?.name ?? null,
    partnerCoverageResponsibility: partner?.coverageResponsibility ?? null,
    complianceIssues,
  };
}
