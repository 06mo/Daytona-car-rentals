export type AdjustmentType = "extension" | "fee" | "credit" | "correction";

export type AdjustmentStatus = "pending" | "paid" | "waived" | "applied";

export type ExtensionAdjustmentDetails = {
  originalEndDate: Date;
  newEndDate: Date;
  additionalDays: number;
  dailyRate: number;
};

export type BookingAdjustment = {
  id: string;
  bookingId: string;
  type: AdjustmentType;
  amountCents: number;
  reason: string;
  customerVisibleNote?: string;
  status: AdjustmentStatus;
  extensionDetails?: ExtensionAdjustmentDetails;
  stripePaymentIntentId?: string;
  stripePaymentLinkUrl?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  paidAt?: Date;
  waivedAt?: Date;
  waivedBy?: string;
};

export type CreateBookingAdjustmentInput = {
  type: AdjustmentType;
  amountCents?: number;
  reason: string;
  customerVisibleNote?: string;
  newEndDate?: Date;
};
