"use client";

import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { MagicLinkRequestForm } from "@/components/auth/MagicLinkRequestForm";
import { Button } from "@/components/ui/Button";
import { useBooking } from "@/components/providers/BookingProvider";

export function EmailEntryStep() {
  return <EmailEntryStepContent />;
}

type EmailEntryStepContentProps = {
  description?: string;
  step?: number;
  title?: string;
};

export function EmailEntryStepContent({
  description = "Enter your email and we'll send you a secure sign-in link so you can finish checkout without losing your booking.",
  step,
  title = "Verify your identity to continue",
}: EmailEntryStepContentProps = {}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setStep, state } = useBooking();
  const resumeStep = step ?? state.step;

  const continueUrl = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("resume", "true");
    params.set("resumeStep", String(resumeStep));
    const query = params.toString();
    return `${pathname}${query ? `?${query}` : ""}`;
  }, [pathname, resumeStep, searchParams]);

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-orange-200 bg-orange-50 p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-600">One Last Step</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
      </div>

      <MagicLinkRequestForm buttonLabel="Send Secure Link" continueUrl={continueUrl} />

      <div className="flex gap-3">
        <Button onClick={() => setStep(Math.max(resumeStep - 1, 1))} type="button" variant="secondary">
          Back
        </Button>
      </div>
    </div>
  );
}
