import type {
  BookingExtras,
  BookingPricing,
  DateRangePricingRule,
  ExtrasPricing,
  LongTermDiscountRule,
  PricingRule,
  ProtectionPackageId,
  ProtectionPricing,
  Vehicle,
  WeekendPricingRule,
} from "@/types";

import { getDateRangeInDays } from "@/lib/utils/dateUtils";

export function computeBookingPricing(
  vehicle: Vehicle,
  extrasPricing: ExtrasPricing,
  protectionPricing: ProtectionPricing,
  extras: BookingExtras,
  protectionPackage: ProtectionPackageId,
  startDate: Date,
  endDate: Date,
  rules: PricingRule[] = [],
): BookingPricing {
  const totalDays = getDateRangeInDays(startDate, endDate);
  const baseAmount = vehicle.dailyRate * totalDays;
  const days = getBookingDays(startDate, endDate);
  const surchargeRuleNames = new Set<string>();
  let adjustedBase = 0;

  for (const day of days) {
    const applicableSurcharges = rules.filter((rule): rule is WeekendPricingRule | DateRangePricingRule => {
      if (!rule.active || rule.type === "long_term_discount") {
        return false;
      }

      if (rule.type === "weekend") {
        return rule.weekdays.includes(day.getDay());
      }

      return dayMatchesDateRange(day, rule);
    });

    const adjustedDayRate = applicableSurcharges.reduce((rate, rule) => {
      surchargeRuleNames.add(rule.name);
      return rate * rule.multiplier;
    }, vehicle.dailyRate);

    adjustedBase += Math.round(adjustedDayRate);
  }

  const eligibleLongTermRules = rules.filter(
    (rule): rule is LongTermDiscountRule => rule.active && rule.type === "long_term_discount" && rule.minDays <= totalDays,
  );
  const bestLongTermRule = eligibleLongTermRules.sort((first, second) => first.multiplier - second.multiplier)[0];
  const discountAmount = bestLongTermRule ? Math.round(adjustedBase * (1 - bestLongTermRule.multiplier)) : 0;

  if (bestLongTermRule) {
    surchargeRuleNames.add(bestLongTermRule.name);
  }

  const extrasAmount =
    (extras.additionalDriver ? extrasPricing.additionalDriver * totalDays : 0) +
    (extras.gps ? extrasPricing.gps * totalDays : 0) +
    (extras.childSeat ? extrasPricing.childSeat * totalDays : 0);
  const protectionAmount =
    (protectionPackage === "standard" ? protectionPricing.standard : protectionPackage === "premium" ? protectionPricing.premium : 0) *
    totalDays;
  const depositAmount = Math.round(vehicle.depositAmount * (protectionPackage === "premium" ? 0.5 : 1));
  const surchargeAmount = Math.max(adjustedBase - baseAmount, 0);

  return {
    dailyRate: vehicle.dailyRate,
    totalDays,
    baseAmount,
    extrasAmount,
    protectionAmount,
    depositAmount,
    totalAmount: adjustedBase - discountAmount + extrasAmount + protectionAmount,
    surchargeAmount,
    discountAmount,
    appliedRuleNames: Array.from(surchargeRuleNames),
  };
}

function getBookingDays(startDate: Date, endDate: Date) {
  const days: Date[] = [];
  const cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (cursor < end) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function dayMatchesDateRange(day: Date, rule: DateRangePricingRule) {
  if (rule.recurring) {
    const [, startMM, startDD] = rule.startDate.split("-").map(Number);
    const [, endMM, endDD] = rule.endDate.split("-").map(Number);
    const dayMM = day.getMonth() + 1;
    const dayDD = day.getDate();
    const dayVal = dayMM * 100 + dayDD;
    const startVal = startMM * 100 + startDD;
    const endVal = endMM * 100 + endDD;

    if (startVal <= endVal) {
      return dayVal >= startVal && dayVal <= endVal;
    }

    return dayVal >= startVal || dayVal <= endVal;
  }

  const start = new Date(`${rule.startDate}T00:00:00Z`);
  const end = new Date(`${rule.endDate}T00:00:00Z`);
  const normalizedDay = new Date(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate()));
  return normalizedDay >= start && normalizedDay <= end;
}
