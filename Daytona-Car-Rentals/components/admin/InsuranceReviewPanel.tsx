"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import type { InsuranceBlockingReason, InsuranceVerificationStatus, InsuranceVerificationSummary } from "@/types";

type InsuranceReviewPanelProps = {
  bookingId: string;
  summary: InsuranceVerificationSummary;
};

const BLOCKING_REASON_LABELS: Record<InsuranceBlockingReason, string> = {
  policy_not_active: "Policy not active",
  name_mismatch: "Named insured mismatch",
  liability_limits_too_low: "Liability limits too low",
  rental_use_excluded: "Rental use excluded",
  peer_to_peer_excluded: "Peer-to-peer use excluded",
  commercial_use_excluded: "Commercial use excluded",
  document_unreadable: "Document unreadable",
  missing_required_fields: "Missing required fields",
  coverage_expired: "Coverage expired",
  no_document_on_file: "No document on file",
  provider_unavailable: "Provider unavailable",
  platform_trip_id_missing: "Platform trip ID missing",
  partner_not_active: "Partner not active",
  partner_coverage_not_declared: "Partner coverage not declared",
  admin_rejected: "Rejected by admin",
  manual_review_required: "Manual review required",
};

const TERMINAL_STATUSES: InsuranceVerificationStatus[] = ["verified", "rejected"];

export function InsuranceReviewPanel({ bookingId, summary }: InsuranceReviewPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [carrierName, setCarrierName] = useState(summary.carrierName ?? "");

  const canFinalize = !TERMINAL_STATUSES.includes(summary.status);

  function runFinalize(status: "verified" | "rejected", blockingReasons: InsuranceBlockingReason[]) {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/insurance/verify-renter-policy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "finalize",
            bookingId,
            result: {
              status,
              verifiedBy: "admin",
              carrierName: carrierName.trim() || undefined,
              blockingReasons,
              namedInsuredMatch: status === "verified" ? true : undefined,
              policyActive: status === "verified" ? true : undefined,
            },
          }),
        });

        const data = (await response.json().catch(() => null)) as { error?: string } | null;

        if (!response.ok) {
          throw new Error(data?.error ?? "Unable to finalize insurance verification.");
        }

        setSuccess(status === "verified" ? "Verification approved." : "Verification rejected.");
        router.refresh();
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unable to finalize insurance verification.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 text-sm text-slate-600">
        <div className="flex items-center justify-between">
          <span className="font-medium text-slate-900">Verification status</span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              summary.status === "verified"
                ? "bg-emerald-100 text-emerald-700"
                : summary.status === "rejected"
                  ? "bg-red-100 text-red-700"
                  : summary.status === "pending"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-slate-100 text-slate-600"
            }`}
          >
            {summary.status}
          </span>
        </div>

        {summary.coverageDecisionStatus ? (
          <div className="flex items-center justify-between">
            <span>Coverage decision</span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                summary.coverageDecisionStatus === "approved"
                  ? "bg-emerald-100 text-emerald-700"
                  : summary.coverageDecisionStatus === "rejected"
                    ? "bg-red-100 text-red-700"
                    : "bg-amber-100 text-amber-700"
              }`}
            >
              {summary.coverageDecisionStatus}
            </span>
          </div>
        ) : null}

        {summary.coverageSource ? <p>Coverage source: {summary.coverageSource.replaceAll("_", " ")}</p> : null}
        {summary.carrierName ? <p>Carrier: {summary.carrierName}</p> : null}
        {summary.effectiveDate ? <p>Effective: {summary.effectiveDate.toLocaleDateString()}</p> : null}
        {summary.expirationDate ? <p>Expires: {summary.expirationDate.toLocaleDateString()}</p> : null}
        {summary.liabilityLimitsCents != null ? (
          <p>Liability limits: {formatCurrency(summary.liabilityLimitsCents / 100)}</p>
        ) : null}
        {summary.namedInsuredMatch != null ? (
          <p>Named insured match: {summary.namedInsuredMatch ? "Yes" : "No"}</p>
        ) : null}
        {summary.verifiedBy ? <p>Verified by: {summary.verifiedBy}</p> : null}
        {summary.resolvedAt ? <p>Resolved at: {summary.resolvedAt.toLocaleString()}</p> : null}

        {summary.blockingReasons.length > 0 ? (
          <div>
            <p className="font-medium text-slate-900">Blocking reasons</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {summary.blockingReasons.map((reason) => (
                <span key={reason} className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                  {BLOCKING_REASON_LABELS[reason] ?? reason}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {canFinalize ? (
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Finalize verification</p>
          {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
          {success ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p> : null}
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Carrier name (optional)
            <input
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
              type="text"
              value={carrierName}
              onChange={(event) => setCarrierName(event.target.value)}
              placeholder="e.g. State Farm"
              disabled={isPending}
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              disabled={isPending}
              onClick={() => runFinalize("verified", [])}
            >
              Approve
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={isPending}
              onClick={() => runFinalize("rejected", ["admin_rejected"])}
            >
              Reject
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
