"use client";

import { BookingProvider, useBooking } from "@/components/providers/BookingProvider";
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
  const { setStep, state, vehicle } = useBooking();

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">Booking Flow</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">
          Book your {vehicle.year} {vehicle.make} {vehicle.model}
        </h1>
      </div>

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
