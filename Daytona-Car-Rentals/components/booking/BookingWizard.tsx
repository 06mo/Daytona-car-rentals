"use client";

import { BookingProvider, useBooking } from "@/components/providers/BookingProvider";
import { BookingRecoveryPanel } from "@/components/booking/BookingRecoveryPanel";
import { StepIndicator } from "@/components/booking/StepIndicator";
import { Card, CardContent } from "@/components/ui/Card";
import { Step1Dates } from "@/components/booking/steps/Step1Dates";
import { Step2Extras } from "@/components/booking/steps/Step2Extras";
import { Step3Documents } from "@/components/booking/steps/Step3Documents";
import { Step4Review } from "@/components/booking/steps/Step4Review";
import { Step5Payment } from "@/components/booking/steps/Step5Payment";
import type { Vehicle } from "@/types";

const steps = ["Dates", "Extras", "Documents", "Review", "Payment"];

function BookingWizardInner() {
  const { clearDraft, hasRecoveredDraft, lastSavedAt, setStep, state, vehicle } = useBooking();

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">Booking Flow</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">
          Book your {vehicle.year} {vehicle.make} {vehicle.model}
        </h1>
      </div>

      {hasRecoveredDraft ? (
        <div className="flex flex-col gap-3 rounded-3xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm text-sky-800 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Resumed your saved booking draft
            {lastSavedAt ? ` from ${new Date(lastSavedAt).toLocaleString()}` : ""}.
          </p>
          <button className="font-semibold text-sky-900 underline-offset-4 hover:underline" onClick={clearDraft} type="button">
            Discard draft
          </button>
        </div>
      ) : null}

      <BookingRecoveryPanel />

      <StepIndicator currentStep={state.step} labels={steps} onStepSelect={setStep} />

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
  initialResume = false,
  initialResumeStep,
  vehicle,
}: {
  initialEndDate?: string;
  initialLocation?: string;
  initialStartDate?: string;
  initialResume?: boolean;
  initialResumeStep?: number;
  vehicle: Vehicle;
}) {
  return (
    <BookingProvider
      initialEndDate={initialEndDate}
      initialLocation={initialLocation}
      initialStartDate={initialStartDate}
      initialResume={initialResume}
      initialResumeStep={initialResumeStep}
      vehicle={vehicle}
    >
      <BookingWizardInner />
    </BookingProvider>
  );
}
