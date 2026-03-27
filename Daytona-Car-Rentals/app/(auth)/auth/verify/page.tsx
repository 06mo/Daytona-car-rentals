"use client";

import {
  browserLocalPersistence,
  isSignInWithEmailLink,
  setPersistence,
  signInWithEmailLink,
} from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import {
  clearPendingMagicLinkEmail,
  getPendingMagicLinkEmail,
  setSessionCookie,
  storePendingMagicLinkEmail,
} from "@/lib/auth/clientSession";
import { getClientServices } from "@/lib/firebase/client";

function MagicLinkVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasAttemptedVerification = useRef(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const continueUrl = useMemo(() => {
    const nextUrl = searchParams.get("continueUrl");
    return nextUrl && nextUrl.startsWith("/") ? nextUrl : "/dashboard";
  }, [searchParams]);

  const completeSignIn = useCallback(
    async (resolvedEmail: string) => {
      const services = getClientServices();

      if (!services) {
        throw new Error("Firebase is not configured.");
      }

      await setPersistence(services.auth, browserLocalPersistence);
      const credential = await signInWithEmailLink(services.auth, resolvedEmail, window.location.href);
      clearPendingMagicLinkEmail();

      let idToken = await credential.user.getIdToken();
      setSessionCookie(idToken);

      const registrationResponse = await fetch("/api/auth/complete-registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          displayName: credential.user.displayName ?? undefined,
        }),
      });

      if (!registrationResponse.ok) {
        throw new Error("Unable to complete your sign-in.");
      }

      idToken = await credential.user.getIdToken(true);
      setSessionCookie(idToken);
      router.replace(continueUrl);
    },
    [continueUrl, router],
  );

  useEffect(() => {
    if (hasAttemptedVerification.current) {
      return;
    }

    hasAttemptedVerification.current = true;
    const services = getClientServices();

    if (!services) {
      setError("Firebase is not configured.");
      return;
    }

    if (!isSignInWithEmailLink(services.auth, window.location.href)) {
      setError("This sign-in link is invalid or has expired. Please request a new link.");
      setNeedsEmailConfirmation(true);
      return;
    }

    const storedEmail = getPendingMagicLinkEmail();

    if (!storedEmail) {
      setNeedsEmailConfirmation(true);
      return;
    }

    setEmail(storedEmail);
    setSubmitting(true);
    void completeSignIn(storedEmail).catch(() => {
      setError("This link is invalid or has expired. Please request a new link.");
      setNeedsEmailConfirmation(true);
      setSubmitting(false);
    });
  }, [completeSignIn]);

  async function handleConfirmEmail(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      storePendingMagicLinkEmail(normalizedEmail);
      await completeSignIn(normalizedEmail);
    } catch {
      setError("This link is invalid or has expired. Please request a new link.");
      setSubmitting(false);
    }
  }

  async function requestNewLink() {
    setError(null);
    setSubmitting(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          continueUrl,
        }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(data?.error ?? "Unable to send a new link.");
      }

      storePendingMagicLinkEmail(normalizedEmail);
      router.replace(
        `/auth/magic-link-sent?email=${encodeURIComponent(normalizedEmail)}&continueUrl=${encodeURIComponent(continueUrl)}`,
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to send a new link.");
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-md px-6 py-16">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">Secure Sign-In</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Verify your link</h1>

        {!needsEmailConfirmation && !error ? (
          <div className="mt-8 flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <Spinner />
            <span className="text-sm text-slate-600">Verifying your sign-in link...</span>
          </div>
        ) : (
          <form className="mt-8 space-y-4" onSubmit={handleConfirmEmail}>
            <p className="text-sm leading-6 text-slate-600">
              {error
                ? "Please enter your email to request a fresh sign-in link."
                : "We need your email to finish signing you in on this device."}
            </p>
            <Input
              autoComplete="email"
              disabled={submitting}
              label="Email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <div className="flex flex-col gap-3 sm:flex-row">
              {!error ? (
                <Button className="flex-1" disabled={submitting} loading={submitting} type="submit">
                  Confirm Email
                </Button>
              ) : (
                <Button
                  className="flex-1"
                  disabled={submitting || !email.trim()}
                  loading={submitting}
                  onClick={requestNewLink}
                  type="button"
                >
                  Request New Link
                </Button>
              )}
              <Button asChild className="flex-1" href="/login" variant="secondary">
                Back to Login
              </Button>
            </div>
          </form>
        )}

        <p className="mt-6 text-sm text-slate-500">
          Trouble with the link?{" "}
          <a className="font-semibold text-orange-600 hover:text-orange-700" href="/login">
            Start over
          </a>
          .
        </p>
      </div>
    </section>
  );
}

export default function MagicLinkVerifyPage() {
  return (
    <Suspense>
      <MagicLinkVerifyContent />
    </Suspense>
  );
}
