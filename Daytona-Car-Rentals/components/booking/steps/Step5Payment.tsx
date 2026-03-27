"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useBooking } from "@/components/providers/BookingProvider";
import { getClientServices } from "@/lib/firebase/client";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

function PaymentForm({ clientSecret, paymentIntentId }: { clientSecret: string; paymentIntentId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { state, setStep } = useBooking();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    if (!stripe || !elements) {
      return;
    }

    setSubmitting(true);
    setError(null);

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: "if_required",
    });

    if (result.error) {
      setError(result.error.message ?? "Payment failed.");
      setSubmitting(false);
      return;
    }

    const currentUser = getClientServices()?.auth.currentUser;
    const token = currentUser ? await currentUser.getIdToken() : "";
    const referralCode = window.sessionStorage.getItem("referral_code") ?? undefined;

    if (!token) {
      setError("Sign in is required before payment can be confirmed.");
      setSubmitting(false);
      return;
    }

    const response = await fetch("/api/bookings/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        paymentIntentId,
        vehicleId: state.vehicleId,
        startDate: state.startDate,
        endDate: state.endDate,
        pickupLocation: state.pickupLocation,
        returnLocation: state.returnLocation,
        extras: state.extras,
        promoCode: state.promoCode || undefined,
        referralCode,
      }),
    });

    const data = (await response.json()) as { booking?: { id: string }; error?: string };

    if (!response.ok || !data.booking) {
      setError(data.error ?? "Booking could not be created after payment.");
      setSubmitting(false);
      return;
    }

    router.push(`/booking/confirmation/${data.booking.id}`);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <PaymentElement />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex gap-3">
        <Button onClick={() => setStep(4)} type="button" variant="secondary">Back</Button>
        <Button onClick={handleConfirm} type="button">{submitting ? "Processing..." : "Confirm Payment"}</Button>
      </div>
      {!getClientServices()?.auth.currentUser ? (
        <p className="text-sm text-slate-500">Sign in with Firebase to send authenticated payment and booking requests.</p>
      ) : null}
    </div>
  );
}

export function Step5Payment() {
  const { state, setPricing } = useBooking();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function preparePayment() {
      try {
        const currentUser = getClientServices()?.auth.currentUser;
        const token = currentUser ? await currentUser.getIdToken() : "";
        const referralCode = window.sessionStorage.getItem("referral_code") ?? undefined;

        if (!token) {
          throw new Error("Sign in is required before payment can begin.");
        }

        const response = await fetch("/api/stripe/create-payment-intent", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            vehicleId: state.vehicleId,
            startDate: state.startDate,
            endDate: state.endDate,
            extras: state.extras,
            promoCode: state.promoCode || undefined,
            referralCode,
          }),
        });

        const data = (await response.json()) as {
          clientSecret?: string;
          paymentIntentId?: string;
          pricing?: typeof state.pricing;
          error?: string;
        };

        if (!response.ok || !data.clientSecret || !data.paymentIntentId) {
          throw new Error(data.error ?? "Could not prepare secure checkout.");
        }

        if (!cancelled) {
          setClientSecret(data.clientSecret);
          setPaymentIntentId(data.paymentIntentId);
          if (data.pricing) {
            setPricing(data.pricing);
          }
        }
      } catch (paymentError) {
        if (!cancelled) {
          setError(paymentError instanceof Error ? paymentError.message : "Could not prepare secure checkout.");
        }
      }
    }

    preparePayment();

    return () => {
      cancelled = true;
    };
  }, [setPricing, state.endDate, state.extras, state.promoCode, state.startDate, state.vehicleId]);

  const options = useMemo(
    () =>
      clientSecret
        ? {
            clientSecret,
            appearance: {
              theme: "stripe" as const,
              variables: {
                colorPrimary: "#f97316",
                borderRadius: "8px",
                fontFamily: "Segoe UI, system-ui, sans-serif",
              },
            },
          }
        : undefined,
    [clientSecret],
  );

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!clientSecret || !paymentIntentId || !options || !stripePromise) {
    return (
      <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <Spinner />
        <span className="text-sm text-slate-600">Preparing secure checkout...</span>
      </div>
    );
  }

  return (
    <Elements options={options} stripe={stripePromise}>
      <PaymentForm clientSecret={clientSecret} paymentIntentId={paymentIntentId} />
    </Elements>
  );
}
