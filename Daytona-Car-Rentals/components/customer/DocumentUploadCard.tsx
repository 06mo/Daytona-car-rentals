"use client";

import { useRouter } from "next/navigation";

import { DocumentUpload } from "@/components/documents/DocumentUpload";
import { Badge } from "@/components/ui/Badge";
import type { DocumentStatus } from "@/types";

type DocumentUploadCardProps = {
  label: string;
  lastUploaded?: string;
  rejectionReason?: string;
  status?: DocumentStatus;
  type: "drivers_license" | "insurance_card";
  userId: string;
};

const statusClasses: Record<DocumentStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-700",
};

export function DocumentUploadCard({
  label,
  lastUploaded,
  rejectionReason,
  status,
  type,
  userId,
}: DocumentUploadCardProps) {
  const router = useRouter();

  return (
    <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{label}</h2>
          <p className="mt-2 text-sm text-slate-500">Last uploaded: {lastUploaded ?? "Not uploaded yet"}</p>
        </div>
        {status ? <Badge className={statusClasses[status]}>{status}</Badge> : <Badge>Not uploaded</Badge>}
      </div>

      {rejectionReason ? (
        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{rejectionReason}</p>
      ) : null}

      <div className="mt-6">
        <DocumentUpload onUploadComplete={() => router.refresh()} type={type} userId={userId} />
      </div>
    </article>
  );
}
