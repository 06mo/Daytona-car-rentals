"use client";

import { Check } from "lucide-react";

type StepIndicatorProps = {
  currentStep: number;
  labels: string[];
  onStepSelect?: (step: number) => void;
};

export function StepIndicator({ currentStep, labels, onStepSelect }: StepIndicatorProps) {
  return (
    <div className="grid gap-3 md:grid-cols-5">
      {labels.map((label, index) => {
        const stepNumber = index + 1;
        const isComplete = currentStep > stepNumber;
        const isCurrent = currentStep === stepNumber;

        return (
          <button
            key={label}
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left ${isCurrent ? "border-orange-500 bg-orange-50" : "border-slate-200 bg-white"} ${isComplete ? "cursor-pointer" : ""}`}
            disabled={!isComplete && !isCurrent}
            onClick={() => {
              if (isComplete) {
                onStepSelect?.(stepNumber);
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
  );
}
