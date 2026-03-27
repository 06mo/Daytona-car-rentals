export type PromoCodeType = "percent" | "fixed";

export type PromoCode = {
  id: string;
  code: string;
  name: string;
  type: PromoCodeType;
  amount: number;
  active: boolean;
  expiresAt?: Date;
  minSubtotalAmount?: number;
  maxDiscountAmount?: number;
  repeatCustomersOnly?: boolean;
  createdAt: Date;
  updatedAt: Date;
};
