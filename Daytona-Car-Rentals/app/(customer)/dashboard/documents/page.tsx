import { redirect } from "next/navigation";

import { DocumentUploadCard } from "@/components/customer/DocumentUploadCard";
import { VerificationStatusBanner } from "@/components/customer/VerificationStatusBanner";
import { getServerUserId } from "@/lib/auth/getServerUserId";
import { getUserVerificationSummary } from "@/lib/services/documentService";

export default async function CustomerDocumentsPage() {
  const userId = await getServerUserId();

  if (!userId) {
    redirect("/login?returnUrl=%2Fdashboard%2Fdocuments");
  }

  const summary = await getUserVerificationSummary(userId);

  if (!summary) {
    redirect("/dashboard");
  }

  const driversLicense = summary.documents.find((document) => document.type === "drivers_license");
  const insuranceCard = summary.documents.find((document) => document.type === "insurance_card");

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">Portal</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Documents</h1>
      </div>

      <VerificationStatusBanner status={summary.verificationStatus} />

      <div className="grid gap-6">
        <DocumentUploadCard
          label="Driver's License"
          lastUploaded={driversLicense?.uploadedAt.toLocaleDateString()}
          rejectionReason={driversLicense?.rejectionReason}
          status={driversLicense?.status}
          type="drivers_license"
          userId={userId}
        />
        <DocumentUploadCard
          label="Insurance Card"
          lastUploaded={insuranceCard?.uploadedAt.toLocaleDateString()}
          rejectionReason={insuranceCard?.rejectionReason}
          status={insuranceCard?.status}
          type="insurance_card"
          userId={userId}
        />
      </div>
    </section>
  );
}
