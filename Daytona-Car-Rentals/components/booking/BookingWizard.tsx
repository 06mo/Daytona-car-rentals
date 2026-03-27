"use client";

import { Check } from "lucide-react";

import { BookingProvider, useBooking } from "@/components/providers/BookingProvider";
import { Card, CardContent } from "@/components/ui/Card";
import { Step1Dates } from "@/components/booking/steps/Step1Dates";
import { Step2Extras } from "@/components/booking/steps/Step2Extras";
import { Step3Documents } from "@/components/booking/steps/Step3Documents";
import { Step4Review } from "@/components/booking/steps/Step4Review";
import { Step5Payment } from "@/components/booking/steps/Step5Payment";
import type { Vehicle } from "@/types";

const steps = ["Dates", "Extras", "Documents", "Review", "Payment"];

function BookingWizardInner() {
  const { setStep, state, vehicle } = useBooking();

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">Booking Flow</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">
          Book your {vehicle.year} {vehicle.make} {vehicle.model}
        </h1>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        {steps.map((label, index) => {
          const stepNumber = index + 1;
          const isComplete = state.step > stepNumber;
          const isCurrent = state.step === stepNumber;

          return (
            <button
              key={label}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left ${isCurrent ? "border-orange-500 bg-orange-50" : "border-slate-200 bg-white"} ${isComplete ? "cursor-pointer" : ""}`}
              disabled={!isComplete && !isCurrent}
              onClick={() => {
                if (isComplete) {
                  setStep(stepNumber);
                }
              }}
              type="button"
            >
              <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${isComplete || isCurrent ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-500"}`}>
                {isComplete ? <Check className="h-4 w-4" /> : stepNumber}
              </span>
              <span className="text-sm font-medium text-slate-700">{label}</span>
            </button>
          );
        })}
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="pt-6">
          {state.step === 1 ? <Step1Dates /> : null}
          {state.step === 2 ? <Step2Extras /> : null}
          {state.step === 3 ? <Step3Documents /> : null}
          {state.step === 4 ? <Step4Review /> : null}
          {state.step === 5 ? <Step5Payment /> : null}
        </CardContent>
      </Card>
    </div>
  );
}

export function BookingWizard({
  initialEndDate,
  initialLocation,
  initialStartDate,
  vehicle,
}: {
  initialEndDate?: string;
  initialLocation?: string;
  initialStartDate?: string;
  vehicle: Vehicle;
}) {
  return (
    <BookingProvider
      initialEndDate={initialEndDate}
      initialLocation={initialLocation}
      initialStartDate={initialStartDate}
      vehicle={vehicle}
    >
      <BookingWizardInner />
    </BookingProvider>
  );
}
