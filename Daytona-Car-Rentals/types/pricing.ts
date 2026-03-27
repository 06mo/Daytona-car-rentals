export type PricingRuleType = "weekend" | "date_range" | "long_term_discount";

export type WeekendPricingRule = {
  id: string;
  type: "weekend";
  name: string;
  multiplier: number;
  weekdays: number[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type DateRangePricingRule = {
  id: string;
  type: "date_range";
  name: string;
  multiplier: number;
  startDate: string;
  endDate: string;
  recurring: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type LongTermDiscountRule = {
  id: string;
  type: "long_term_discount";
  name: string;
  minDays: number;
  multiplier: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type PricingRule = WeekendPricingRule | DateRangePricingRule | LongTermDiscountRule;
