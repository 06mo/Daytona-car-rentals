"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PriceSummary } from "@/components/booking/PriceSummary";
import { useBooking } from "@/components/providers/BookingProvider";
import { getClientServices } from "@/lib/firebase/client";
import { computeBookingPricing } from "@/lib/utils/pricing";
import { formatCurrency } from "@/lib/utils";

const extrasMeta = {
  additionalDriver: { title: "Additional Driver", description: "Add a second authorised driver." },
  gps: { title: "GPS Navigation", description: "In-car GPS unit for easy routing." },
  childSeat: { title: "Child Seat", description: "Suitable for family travel and weekend pickups." },
  cdw: { title: "Collision Damage Waiver", description: "Reduce excess to $0." },
};

export function Step2Extras() {
  const { extrasPricing, state, toggleExtra, setPricing, setPromoCode, setStep, vehicle } = useBooking();
  const [promoInput, setPromoInput] = useState(state.promoCode);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [submittingPromo, setSubmittingPromo] = useState(false);

  async function handleApplyPromo() {
    const trimmedCode = promoInput.trim().toUpperCase();

    if (!trimmedCode) {
      setPromoError("Enter a promo code to apply it.");
      setPromoMessage(null);
      return;
    }

    setSubmittingPromo(true);
    setPromoError(null);
    setPromoMessage(null);

    try {
      const currentUser = getClientServices()?.auth.currentUser;
      const token = currentUser ? await currentUser.getIdToken() : "";

      if (!token) {
        throw new Error("Sign in is required before applying a promo code.");
      }

      const response = await fetch("/api/promo/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: trimmedCode,
          vehicleId: state.vehicleId,
          startDate: state.startDate,
          endDate: state.endDate,
          extras: state.extras,
        }),
      });

      const data = (await response.json()) as {
        promoCode?: { code: string; name: string };
        pricing?: typeof state.pricing;
        error?: string;
      };

      if (!response.ok || !data.pricing || !data.promoCode) {
        throw new Error(data.error ?? "Promo code could not be applied.");
      }

      setPromoCode(data.promoCode.code);
      setPromoInput(data.promoCode.code);
      setPricing(data.pricing);
      setPromoMessage(`${data.promoCode.name} applied.`);
    } catch (error) {
      setPromoError(error instanceof Error ? error.message : "Promo code could not be applied.");
      setPromoMessage(null);
      setPromoCode("");
      if (state.startDate && state.endDate && new Date(state.endDate) > new Date(state.startDate)) {
        setPricing(
          computeBookingPricing(
            vehicle,
            extrasPricing,
            state.extras,
            new Date(state.startDate),
            new Date(state.endDate),
          ),
        );
      }
    } finally {
      setSubmittingPromo(false);
    }
  }

  function handleContinue() {
    void fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName: "booking_extras_completed",
        path: window.location.pathname,
        sessionId: window.sessionStorage.getItem("analytics_session_id") ?? undefined,
        metadata: {
          vehicleId: state.vehicleId,
          extras: state.extras,
        },
      }),
    }).catch(() => undefined);

    setStep(3);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        {Object.entries(extrasMeta).map(([key, meta]) => {
          const extraKey = key as keyof typeof state.extras;
          const selected = state.extras[extraKey];
          const price = extrasPricing[extraKey];

          return (
            <button
              key={key}
              className={`rounded-3xl border p-5 text-left transition ${selected ? "border-orange-500 bg-orange-50" : "border-slate-200 bg-white"}`}
              onClick={() => toggleExtra(extraKey)}
              type="button"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-base font-semibold text-slate-900">{meta.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{meta.description}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-orange-500">+{formatCurrency(price / 100)}/day</p>
                  {selected ? <p className="text-xs text-slate-500">Selected</p> : null}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Input
            className="sm:flex-1"
            hint="Promo discounts are verified on the server before payment is created."
            label="Promo code"
            onChange={(event) => {
              setPromoInput(event.target.value.toUpperCase());
              setPromoError(null);
              setPromoMessage(null);
            }}
            placeholder="Enter code"
            value={promoInput}
          />
          <Button disabled={submittingPromo || !state.startDate || !state.endDate} onClick={handleApplyPromo} type="button">
            {submittingPromo ? "Applying..." : "Apply Code"}
          </Button>
        </div>
        {promoError ? <p className="mt-3 text-sm text-red-600">{promoError}</p> : null}
        {!promoError && promoMessage ? <p className="mt-3 text-sm text-emerald-700">{promoMessage}</p> : null}
      </div>
      <PriceSummary />
      <div className="flex gap-3">
        <Button onClick={() => setStep(1)} type="button" variant="secondary">Back</Button>
        <Button onClick={handleContinue} type="button">Continue to Documents</Button>
      </div>
    </div>
  );
}
