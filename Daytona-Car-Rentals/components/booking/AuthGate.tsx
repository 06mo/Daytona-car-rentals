"use client";

import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState, type ReactNode } from "react";

import { EmailEntryStepContent } from "@/components/booking/EmailEntryStep";
import { Spinner } from "@/components/ui/Spinner";
import { getClientServices } from "@/lib/firebase/client";

export function AuthGate({
  children,
  description,
  step,
  title,
}: {
  children: ReactNode;
  description?: string;
  step?: number;
  title?: string;
}) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const services = getClientServices();

    if (!services) {
      setLoading(false);
      setAuthenticated(false);
      return;
    }

    return onAuthStateChanged(services.auth, (user) => {
      setAuthenticated(Boolean(user));
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <Spinner />
        <span className="text-sm text-slate-600">Checking your sign-in status...</span>
      </div>
    );
  }

  if (!authenticated) {
    return <EmailEntryStepContent description={description} step={step} title={title} />;
  }

  return <>{children}</>;
}
