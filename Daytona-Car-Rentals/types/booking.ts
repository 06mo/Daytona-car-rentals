import type { PaymentStatus } from "@/types/payment";

export type BookingStatus =
  | "pending_verification"
  | "pending_payment"
  | "confirmed"
  | "active"
  | "completed"
  | "cancelled"
  | "payment_failed";

export type BookingExtras = {
  additionalDriver: boolean;
  gps: boolean;
  childSeat: boolean;
  cdw: boolean;
};

export type BookingPricing = {
  dailyRate: number;
  totalDays: number;
  baseAmount: number;
  extrasAmount: number;
  depositAmount: number;
  totalAmount: number;
  surchargeAmount?: number;
  discountAmount?: number;
  appliedRuleNames?: string[];
  promoDiscountAmount?: number;
  promoCode?: string;
  promoCodeName?: string;
};

export type Booking = {
  id: string;
  userId: string;
  vehicleId: string;
  referralCode?: string;
  partnerId?: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  pickupLocation: string;
  returnLocation: string;
  extras: BookingExtras;
  pricing: BookingPricing;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  stripePaymentIntentId: string;
  stripeCustomerId: string;
  adminNotes?: string;
  cancellationReason?: string;
  cancelledBy?: "customer" | "admin";
  createdAt: Date;
  updatedAt: Date;
  confirmedAt?: Date;
  cancelledAt?: Date;
  completedAt?: Date;
};

export type CreateBookingInput = {
  userId: string;
  vehicleId: string;
  referralCode?: string;
  partnerId?: string;
  startDate: Date;
  endDate: Date;
  pickupLocation: string;
  returnLocation: string;
  extras: BookingExtras;
  pricing: BookingPricing;
  stripePaymentIntentId: string;
  stripeCustomerId: string;
  status?: BookingStatus;
  paymentStatus?: PaymentStatus;
  adminNotes?: string;
};
