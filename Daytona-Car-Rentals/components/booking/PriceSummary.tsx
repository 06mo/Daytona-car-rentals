import { formatCurrency } from "@/lib/utils";
import { useBooking } from "@/components/providers/BookingProvider";

export function PriceSummary() {
  const { state } = useBooking();
  const surchargeAmount = state.pricing.surchargeAmount ?? 0;
  const discountAmount = state.pricing.discountAmount ?? 0;
  const promoDiscountAmount = state.pricing.promoDiscountAmount ?? 0;
  const subtotal = state.pricing.baseAmount + surchargeAmount - discountAmount;
  const ruleNames = state.pricing.appliedRuleNames ?? [];
  const surchargeLabel =
    surchargeAmount > 0 && ruleNames.filter((name) => !name.includes("Rate (")).length > 1
      ? "Peak season surcharge"
      : "Surcharge";
  const discountLabel =
    discountAmount > 0
      ? ruleNames.find((name) => name.includes("Rate (")) ?? "Long-term discount"
      : "Discount";

  return (
    <div className="rounded-3xl bg-slate-50 p-5">
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>
          {state.pricing.totalDays} days x {formatCurrency(state.pricing.dailyRate / 100)}/day
        </span>
        <span>{formatCurrency(state.pricing.baseAmount / 100)}</span>
      </div>
      {surchargeAmount > 0 ? (
        <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
          <span>{surchargeLabel}</span>
          <span>+{formatCurrency(surchargeAmount / 100)}</span>
        </div>
      ) : null}
      {discountAmount > 0 ? (
        <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
          <span>{discountLabel}</span>
          <span>-{formatCurrency(discountAmount / 100)}</span>
        </div>
      ) : null}
      <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 text-sm text-slate-600">
        <span>Subtotal</span>
        <span>{formatCurrency(subtotal / 100)}</span>
      </div>
      <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
        <span>Extras</span>
        <span>{formatCurrency(state.pricing.extrasAmount / 100)}</span>
      </div>
      <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
        <span>Protection</span>
        <span>{formatCurrency(state.pricing.protectionAmount / 100)}</span>
      </div>
      {promoDiscountAmount > 0 ? (
        <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
          <span>{state.pricing.promoCodeName ?? state.pricing.promoCode ?? "Promo code"}</span>
          <span>-{formatCurrency(promoDiscountAmount / 100)}</span>
        </div>
      ) : null}
      <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 font-semibold text-slate-900">
        <span>Total</span>
        <span>{formatCurrency(state.pricing.totalAmount / 100)}</span>
      </div>
      <div className="mt-2 flex items-center justify-between text-sm text-slate-500">
        <span>Deposit due now</span>
        <span>{formatCurrency(state.pricing.depositAmount / 100)}</span>
      </div>
      <div className="mt-2 flex items-center justify-between text-sm text-slate-500">
        <span>Balance at pickup</span>
        <span>{formatCurrency((state.pricing.totalAmount - state.pricing.depositAmount) / 100)}</span>
      </div>
    </div>
  );
}
