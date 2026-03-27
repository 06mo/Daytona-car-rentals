"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { useBooking } from "@/components/providers/BookingProvider";
import { formatCurrency } from "@/lib/utils";

export function Step4Review() {
  const { setStep, state, vehicle } = useBooking();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const surchargeAmount = state.pricing.surchargeAmount ?? 0;
  const discountAmount = state.pricing.discountAmount ?? 0;
  const subtotal = state.pricing.baseAmount + surchargeAmount - discountAmount;
  const appliedRuleNames = state.pricing.appliedRuleNames ?? [];
  const surchargeLabel =
    surchargeAmount > 0 && appliedRuleNames.filter((name) => !name.includes("Rate (")).length > 1
      ? "Peak season surcharge"
      : "Surcharge";
  const discountLabel =
    discountAmount > 0
      ? appliedRuleNames.find((name) => name.includes("Rate (")) ?? "Long-term discount"
      : "Discount";

  function handleContinue() {
    if (!acceptedTerms) {
      setError("Please accept the terms to continue.");
      return;
    }

    setError(null);
    void fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName: "booking_review_completed",
        path: window.location.pathname,
        sessionId: window.sessionStorage.getItem("analytics_session_id") ?? undefined,
        metadata: {
          vehicleId: state.vehicleId,
          totalAmount: state.pricing.totalAmount,
        },
      }),
    }).catch(() => undefined);
    setStep(5);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Trip Summary</h3>
            <div className="mt-4 grid gap-2 text-sm text-slate-600">
              <p>Vehicle: {vehicle.year} {vehicle.make} {vehicle.model}</p>
              <p>Dates: {state.startDate} to {state.endDate} ({state.totalDays} days)</p>
              <p>Pick-up: {state.pickupLocation}</p>
              <p>Return: {state.returnLocation}</p>
              <div className="pt-2">
                <button className="text-sm font-semibold text-orange-500" onClick={() => setStep(1)} type="button">
                  Edit dates and location
                </button>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Pricing</h3>
            <div className="mt-4 grid gap-2 text-sm text-slate-600">
              <p>Subtotal: {formatCurrency(subtotal / 100)}</p>
              {surchargeAmount > 0 ? <p>{surchargeLabel}: +{formatCurrency(surchargeAmount / 100)}</p> : null}
              {discountAmount > 0 ? <p>{discountLabel}: -{formatCurrency(discountAmount / 100)}</p> : null}
              <p>Extras: {formatCurrency(state.pricing.extrasAmount / 100)}</p>
              <p className="font-semibold text-slate-900">Total: {formatCurrency(state.pricing.totalAmount / 100)}</p>
              <p>Deposit charged now: {formatCurrency(state.pricing.depositAmount / 100)}</p>
              <p>Balance at pickup: {formatCurrency((state.pricing.totalAmount - state.pricing.depositAmount) / 100)}</p>
              <div className="pt-2">
                <button className="text-sm font-semibold text-orange-500" onClick={() => setStep(2)} type="button">
                  Edit extras
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <label className="flex items-start gap-3 text-sm text-slate-700">
        <input checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} type="checkbox" />
        <span>I agree to the Rental Terms & Conditions.</span>
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex gap-3">
        <Button onClick={() => setStep(3)} type="button" variant="secondary">Back</Button>
        <Button onClick={handleContinue} type="button">Proceed to Payment</Button>
      </div>
    </div>
  );
}
