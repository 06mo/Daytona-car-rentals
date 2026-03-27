"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { DocumentUpload } from "@/components/documents/DocumentUpload";
import { useBooking } from "@/components/providers/BookingProvider";
import { getClientServices } from "@/lib/firebase/client";

export function Step3Documents() {
  const { setDocumentStatus, setDocumentVerificationStatus, setStep, state } = useBooking();
  const [userId, setUserId] = useState("demo-user");
  const [verified, setVerified] = useState(false);
  const [loadingVerification, setLoadingVerification] = useState(true);
  const documentsReady = state.documents.licenseUploaded && state.documents.insuranceUploaded;

  useEffect(() => {
    let cancelled = false;

    async function loadVerification() {
      try {
        const currentUser = getClientServices()?.auth.currentUser;
        if (!currentUser) {
          if (!cancelled) {
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
          verification?: { documents?: Array<{ status?: string; type: string }> } | null;
        };

        if (!cancelled) {
          setUserId(currentUser.uid);
          setVerified(data.profile?.verificationStatus === "verified");
          const licenseDocument = data.verification?.documents?.find((doc) => doc.type === "drivers_license");
          const insuranceDocument = data.verification?.documents?.find((doc) => doc.type === "insurance_card");

          if (licenseDocument) {
            setDocumentStatus("license", true);
            setDocumentVerificationStatus("license", licenseDocument.status === "approved");
          }
          if (insuranceDocument) {
            setDocumentStatus("insurance", true);
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
  }, [setDocumentStatus, setDocumentVerificationStatus]);

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
        Upload both documents to continue. Under review, we&apos;ll verify everything before your trip.
      </div>
      {(state.documents.licenseUploaded || state.documents.insuranceUploaded) ? (
        <div className="grid gap-2 text-sm text-slate-600">
          {state.documents.licenseUploaded ? (
            <p>Driver&apos;s License: {state.documents.licenseVerified ? "Verified" : "Uploaded and pending review"}</p>
          ) : null}
          {state.documents.insuranceUploaded ? (
            <p>Insurance Card: {state.documents.insuranceVerified ? "Verified" : "Uploaded and pending review"}</p>
          ) : null}
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <DocumentUpload
          onUploadComplete={() => {
            setDocumentStatus("license", true);
            setDocumentVerificationStatus("license", false);
          }}
          type="drivers_license"
          userId={userId}
        />
        <DocumentUpload
          onUploadComplete={() => {
            setDocumentStatus("insurance", true);
            setDocumentVerificationStatus("insurance", false);
          }}
          type="insurance_card"
          userId={userId}
        />
      </div>
      <div className="flex gap-3">
        <Button onClick={() => setStep(2)} type="button" variant="secondary">Back</Button>
        <Button disabled={!documentsReady} onClick={() => setStep(4)} type="button">Continue to Review</Button>
      </div>
    </div>
  );
}
