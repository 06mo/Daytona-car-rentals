"use client";

import Link from "next/link";
import { useState } from "react";

import { RentalTermsContent } from "@/components/legal/RentalTermsContent";
import { useToast } from "@/components/providers/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useBooking } from "@/components/providers/BookingProvider";
import { RENTAL_TERMS_VERSION } from "../../../lib/data/rentalTerms";
import { formatBookingDateTime } from "@/lib/utils/bookingDateTime";
import { formatCurrency } from "@/lib/utils";

export function Step4Review() {
  const { setStep, setTermsConsent, state, vehicle } = useBooking();
  const { toast } = useToast();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
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
      toast.error("Please accept the rental terms to continue.");
      return;
    }

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
    setTermsConsent(new Date().toISOString(), RENTAL_TERMS_VERSION);
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
              <p>Dates: {formatBookingDateTime(state.startDate)} to {formatBookingDateTime(state.endDate)} ({state.totalDays} days)</p>
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
              <p>Protection: {formatCurrency(state.pricing.protectionAmount / 100)}</p>
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
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
        <p className="font-semibold text-slate-900">Protection package: {state.protectionPackage}</p>
        <p className="mt-2">
          {state.protectionPackage === "basic"
            ? "You are using your own insurance coverage for this rental."
            : state.protectionPackage === "premium"
              ? "Premium protection includes the fullest coverage and a reduced deposit."
              : "Standard protection includes CDW coverage with a $500 deductible."}
        </p>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-base font-semibold text-slate-900">Rental Terms & Conditions</p>
            <p className="mt-1 text-sm text-slate-600">
              Review the rental agreement before continuing to payment.
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => setTermsOpen(true)} type="button" variant="secondary">
              Read Terms
            </Button>
            <Button asChild href="/terms" target="_blank" rel="noreferrer" type="button" variant="ghost">
              Open Full Page
            </Button>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
          <p>
            By proceeding, the renter agrees to driver eligibility requirements, payment and deposit terms, pickup and
            return obligations, protection and insurance conditions, prohibited-use restrictions, and responsibility for
            tolls, tickets, damages, and approved adjustments.
          </p>
        </div>
        <label className="mt-4 flex items-start gap-3 text-sm text-slate-700">
          <input checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} type="checkbox" />
          <span>
            I have reviewed and agree to the{" "}
            <button className="font-semibold text-orange-500 underline underline-offset-2" onClick={() => setTermsOpen(true)} type="button">
              Rental Terms & Conditions
            </button>
            .
          </span>
        </label>
      </div>
      <div className="flex gap-3">
        <Button onClick={() => setStep(3)} type="button" variant="secondary">Back</Button>
        <Button onClick={handleContinue} type="button">Proceed to Payment</Button>
      </div>
      <Modal
        open={termsOpen}
        title="Rental Terms & Conditions"
        description="Please review the rental agreement before proceeding to payment."
        onClose={() => setTermsOpen(false)}
      >
        <div className="max-h-[65vh] overflow-y-auto pr-1">
          <RentalTermsContent compact />
        </div>
        <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
          <Link className="text-sm font-semibold text-orange-500 underline underline-offset-2" href="/terms" target="_blank" rel="noreferrer">
            Open printable page
          </Link>
          <Button onClick={() => setTermsOpen(false)} type="button">
            Close
          </Button>
        </div>
      </Modal>
    </div>
  );
}
