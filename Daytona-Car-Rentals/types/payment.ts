export type PaymentStatus = "pending" | "paid" | "refunded" | "partially_refunded" | "failed";

export type ExtrasPricing = {
  additionalDriver: number;
  gps: number;
  childSeat: number;
  updatedAt: Date;
};
