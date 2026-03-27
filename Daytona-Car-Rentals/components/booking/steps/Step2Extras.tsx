"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PriceSummary } from "@/components/booking/PriceSummary";
import { useBooking } from "@/components/providers/BookingProvider";
import { getClientServices } from "@/lib/firebase/client";
import { toBookingApiDateTime } from "@/lib/utils/bookingDateTime";
import { computeBookingPricing } from "@/lib/utils/pricing";
import { formatCurrency } from "@/lib/utils";

const extrasMeta = {
  additionalDriver: { title: "Additional Driver", description: "Add a second authorised driver." },
  gps: { title: "GPS Navigation", description: "In-car GPS unit for easy routing." },
  childSeat: { title: "Child Seat", description: "Suitable for family travel and weekend pickups." },
};

export function Step2Extras() {
  const {
    extrasPricing,
    protectionPackages,
    protectionPricing,
    riskProfile,
    riskProfileLoading,
    setPricing,
    setPromoCode,
    setRiskProfile,
    setProtectionPackage,
    setStep,
    state,
    toggleExtra,
    vehicle,
  } = useBooking();
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
          startDate: toBookingApiDateTime(state.startDate),
          endDate: toBookingApiDateTime(state.endDate),
          extras: state.extras,
          protectionPackage: state.protectionPackage,
        }),
      });

      const data = (await response.json()) as {
        promoCode?: { code: string; name: string };
        pricing?: typeof state.pricing;
        riskProfile?: typeof riskProfile;
        error?: string;
      };

      if (!response.ok || !data.pricing || !data.promoCode) {
        throw new Error(data.error ?? "Promo code could not be applied.");
      }

      setPromoCode(data.promoCode.code);
      setPromoInput(data.promoCode.code);
      setPricing(data.pricing);
      if (data.riskProfile) {
        setRiskProfile(data.riskProfile);
      }
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
            protectionPricing,
            state.extras,
            state.protectionPackage,
            new Date(state.startDate),
            new Date(state.endDate),
          ),
        );
      }
    } finally {
      setSubmittingPromo(false);
    }
  }

  const allowedProtectionPackages = riskProfile?.allowedProtectionPackages ?? protectionPackages.map((item) => item.id);
  const riskRestrictionMessage =
    riskProfile?.level === "high"
      ? "This booking requires our highest protection package and manual review."
      : riskProfile?.level === "medium"
        ? "This booking requires Standard or Premium protection."
        : null;

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
          protectionPackage: state.protectionPackage,
        },
      }),
    }).catch(() => undefined);

    setStep(3);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Protection Package</p>
          <p className="mt-1 text-sm text-slate-600">Every booking includes one protection choice. Premium lowers your deposit at checkout.</p>
        </div>
        {riskProfileLoading ? <p className="text-sm text-slate-500">Checking booking risk and protection eligibility...</p> : null}
        {riskProfile ? (
          <div
            className={`rounded-3xl border px-5 py-4 text-sm ${
              riskProfile.level === "high"
                ? "border-red-200 bg-red-50 text-red-700"
                : riskProfile.level === "medium"
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            Risk score: {riskProfile.score}/100 ({riskProfile.level})
            {riskRestrictionMessage ? ` - ${riskRestrictionMessage}` : ""}
          </div>
        ) : null}
        {protectionPackages.map((protectionPackage) => {
          const selected = state.protectionPackage === protectionPackage.id;
          const allowed = allowedProtectionPackages.includes(protectionPackage.id);

          return (
            <button
              key={protectionPackage.id}
              className={`rounded-3xl border p-5 text-left transition ${
                !allowed
                  ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
                  : selected
                    ? "border-orange-500 bg-orange-50"
                    : "border-slate-200 bg-white"
              }`}
              disabled={!allowed}
              onClick={() => setProtectionPackage(protectionPackage.id)}
              type="button"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <p className="text-base font-semibold text-slate-900">{protectionPackage.name}</p>
                    <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                      {protectionPackage.badgeLabel}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{protectionPackage.description}</p>
                  <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                    {protectionPackage.liabilityLabel}
                    {protectionPackage.requiresInsurance ? " · Insurance required" : " · Insurance optional"}
                  </p>
                </div>
                <div className="text-left md:text-right">
                  <p className="font-semibold text-orange-500">
                    {protectionPackage.dailyFee > 0 ? `+${formatCurrency(protectionPackage.dailyFee / 100)}/day` : "Included"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Deposit due now:{" "}
                    {formatCurrency(
                      (protectionPackage.id === "premium" ? Math.round(vehicle.depositAmount * 0.5) : vehicle.depositAmount) / 100,
                    )}
                  </p>
                  {!allowed ? <p className="mt-2 text-xs font-semibold text-red-600">Unavailable for this booking risk profile</p> : null}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="grid gap-4">
        {Object.entries(extrasMeta).map(([key, meta]) => {
          const extraKey = key as keyof typeof extrasMeta;
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
