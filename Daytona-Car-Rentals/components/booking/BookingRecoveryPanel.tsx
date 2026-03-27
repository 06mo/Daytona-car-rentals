"use client";

import { onAuthStateChanged } from "firebase/auth";
import { useMemo, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { MagicLinkRequestForm } from "@/components/auth/MagicLinkRequestForm";
import { useBooking } from "@/components/providers/BookingProvider";
import { getClientServices } from "@/lib/firebase/client";

export function BookingRecoveryPanel() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { state } = useBooking();
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const services = getClientServices();

    if (!services) {
      setAuthenticated(false);
      return;
    }

    return onAuthStateChanged(services.auth, (user) => {
      setAuthenticated(Boolean(user));
    });
  }, []);

  const hasMeaningfulProgress =
    Boolean(state.startDate) ||
    Boolean(state.endDate) ||
    Boolean(state.pickupLocation) ||
    Boolean(state.returnLocation) ||
    Boolean(state.promoCode) ||
    state.step > 1 ||
    Object.values(state.extras).some(Boolean);

  const continueUrl = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("resume", "true");
    params.set("resumeStep", String(state.step));
    const query = params.toString();
    return `${pathname}${query ? `?${query}` : ""}`;
  }, [pathname, searchParams, state.step]);

  if (authenticated || !hasMeaningfulProgress) {
    return null;
  }

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">Need To Finish Later?</p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">Email yourself a secure recovery link</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        We&apos;ll send you a link that brings you back to this booking flow so you can pick up where you left off.
      </p>
      <div className="mt-6">
        <MagicLinkRequestForm buttonLabel="Email Me a Recovery Link" continueUrl={continueUrl} submitVariant="secondary" />
      </div>
    </div>
  );
}
