"use client";

import { useEffect, useState } from "react";

import { AuthGate } from "@/components/booking/AuthGate";
import { Button } from "@/components/ui/Button";
import { DocumentUpload } from "@/components/documents/DocumentUpload";
import { useBooking } from "@/components/providers/BookingProvider";
import { getClientServices } from "@/lib/firebase/client";
import type { DocumentStatus } from "@/types";

export function Step3Documents() {
  return (
    <AuthGate
      description="Upload documents only after verifying your identity so they attach to the right account automatically."
      step={3}
      title="Verify your identity before uploading documents"
    >
      <AuthenticatedStep3Documents />
    </AuthGate>
  );
}

function AuthenticatedStep3Documents() {
  const { setDocumentReviewStatus, setDocumentStatus, setDocumentVerificationStatus, setStep, state } = useBooking();
  const [userId, setUserId] = useState("");
  const [verified, setVerified] = useState(false);
  const [loadingVerification, setLoadingVerification] = useState(true);
  const insuranceRequired = state.protectionPackage === "basic";
  const insuranceRejected = insuranceRequired && state.documents.insuranceStatus === "rejected";
  const documentsReady = state.documents.licenseUploaded && (insuranceRequired ? state.documents.insuranceUploaded : true);

  useEffect(() => {
    let cancelled = false;

    async function loadVerification() {
      try {
        const currentUser = getClientServices()?.auth.currentUser;
        if (!currentUser) {
          if (!cancelled) {
            setUserId("");
            setLoadingVerification(false);
          }
          return;
        }

        const token = await currentUser.getIdToken();
        const response = await fetch("/api/me/verification", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = (await response.json()) as {
          profile?: { verificationStatus?: string } | null;
          verification?: { documents?: Array<{ status?: DocumentStatus; type: string }> } | null;
        };

        if (!cancelled) {
          setUserId(currentUser.uid);
          setVerified(data.profile?.verificationStatus === "verified");
          const licenseDocument = data.verification?.documents?.find((doc) => doc.type === "drivers_license");
          const insuranceDocument = data.verification?.documents?.find((doc) => doc.type === "insurance_card");

          if (licenseDocument) {
            setDocumentStatus("license", true);
            setDocumentReviewStatus("license", licenseDocument.status);
            setDocumentVerificationStatus("license", licenseDocument.status === "approved");
          }
          if (insuranceDocument) {
            setDocumentStatus("insurance", true);
            setDocumentReviewStatus("insurance", insuranceDocument.status);
            setDocumentVerificationStatus("insurance", insuranceDocument.status === "approved");
          }
        }
      } finally {
        if (!cancelled) {
          setLoadingVerification(false);
        }
      }
    }

    loadVerification();

    return () => {
      cancelled = true;
    };
  }, [setDocumentReviewStatus, setDocumentStatus, setDocumentVerificationStatus]);

  useEffect(() => {
    if (verified) {
      const timer = window.setTimeout(() => setStep(4), 1000);
      return () => window.clearTimeout(timer);
    }
  }, [setStep, verified]);

  if (loadingVerification) {
    return <p className="text-sm text-slate-500">Checking verification status...</p>;
  }

  if (verified) {
    return (
      <div className="space-y-4">
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
          Documents verified. You can continue straight to review.
        </div>
        <Button onClick={() => setStep(4)} type="button">Continue to Review</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
        {insuranceRequired
          ? "Basic protection requires both your driver's license and a valid insurance card before you continue."
          : "Upload your driver's license to continue. Insurance is optional for standard and premium protection."}
      </div>
      {(state.documents.licenseUploaded || state.documents.insuranceUploaded) ? (
        <div className="grid gap-2 text-sm text-slate-600">
          {state.documents.licenseUploaded ? (
            <p>
              Driver&apos;s License:{" "}
              {state.documents.licenseStatus === "rejected"
                ? "Rejected"
                : state.documents.licenseVerified
                  ? "Verified"
                  : "Uploaded and pending review"}
            </p>
          ) : null}
          {state.documents.insuranceUploaded ? (
            <p>
              Insurance Card:{" "}
              {state.documents.insuranceStatus === "rejected"
                ? "Rejected"
                : state.documents.insuranceVerified
                  ? "Verified"
                  : "Uploaded and pending review"}
            </p>
          ) : null}
        </div>
      ) : null}
      {insuranceRejected ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          Your insurance card was rejected. Please re-upload or switch to Standard protection.
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <DocumentUpload
          disabled={!userId}
          onUploadComplete={() => {
            setDocumentStatus("license", true);
            setDocumentReviewStatus("license", "pending");
            setDocumentVerificationStatus("license", false);
          }}
          type="drivers_license"
          userId={userId}
        />
        <div>
          <DocumentUpload
            disabled={!userId}
            onUploadComplete={() => {
              setDocumentStatus("insurance", true);
              setDocumentReviewStatus("insurance", "pending");
              setDocumentVerificationStatus("insurance", false);
            }}
            type="insurance_card"
            userId={userId}
          />
          {!insuranceRequired ? <p className="mt-2 text-xs text-slate-500">Optional unless you choose Basic protection.</p> : null}
        </div>
      </div>
      <div className="flex gap-3">
        <Button onClick={() => setStep(2)} type="button" variant="secondary">Back</Button>
        <Button disabled={!documentsReady || insuranceRejected} onClick={() => setStep(4)} type="button">
          Continue to Review
        </Button>
      </div>
    </div>
  );
}
