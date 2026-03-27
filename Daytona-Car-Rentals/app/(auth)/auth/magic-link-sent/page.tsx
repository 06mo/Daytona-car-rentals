"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { MagicLinkRequestForm } from "@/components/auth/MagicLinkRequestForm";

function MagicLinkSentContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const continueUrl = searchParams.get("continueUrl") ?? "/dashboard";
  const isBookingRecovery = continueUrl.startsWith("/booking/");

  return (
    <section className="mx-auto max-w-md px-6 py-16">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">Check Your Email</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
          {isBookingRecovery ? "Your booking recovery link is on the way" : "Your secure link is on the way"}
        </h1>
        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
          <p>{isBookingRecovery ? "We sent a secure booking recovery link to:" : "We sent a secure sign-in link to:"}</p>
          <p className="mt-2 font-semibold text-slate-900">{email || "your email address"}</p>
          <p className="mt-3">
            {isBookingRecovery
              ? "Click the link in that email to reopen your booking flow and continue where you left off."
              : "Click the link in that email to continue."}{" "}
            The link expires in 1 hour.
          </p>
        </div>

        <div className="mt-8 space-y-3">
          <MagicLinkRequestForm
            buttonLabel="Resend Link"
            continueUrl={continueUrl}
            initialEmail={email}
            submitVariant="secondary"
          />
          <Link className="inline-flex font-semibold text-orange-600 hover:text-orange-700" href="/login">
            Use a different email
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function MagicLinkSentPage() {
  return (
    <Suspense>
      <MagicLinkSentContent />
    </Suspense>
  );
}
