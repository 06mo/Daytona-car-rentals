"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency } from "@/lib/utils";
import type { InsuranceBlockingReason, InsuranceVerificationStatus, InsuranceVerificationSummary } from "@/types";

type InsuranceReviewPanelProps = {
  bookingId: string;
  protectionPackage: string;
  rentalChannel: string;
  riskLevel?: string;
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

export function InsuranceReviewPanel({
  bookingId,
  protectionPackage,
  rentalChannel,
  riskLevel,
  summary,
}: InsuranceReviewPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [carrierName, setCarrierName] = useState(summary.carrierName ?? "");
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);

  const canFinalize = !TERMINAL_STATUSES.includes(summary.status);

  function runRequest(action: () => Promise<void>) {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unable to update insurance review.");
      }
    });
  }

  async function postJson(url: string, body: Record<string, unknown>, fallbackMessage: string) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      throw new Error(data?.error ?? fallbackMessage);
    }
  }

  async function finalize(status: InsuranceVerificationStatus, blockingReasons: InsuranceBlockingReason[], message: string) {
    await postJson(
      "/api/insurance/verify-renter-policy",
      {
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
      },
      "Unable to finalize insurance verification.",
    );

    setSuccess(message);
  }

  async function requestRereview() {
    await postJson(
      "/api/insurance/verify-renter-policy",
      {
        action: "request",
        bookingId,
      },
      "Unable to request insurance re-review.",
    );

    setSuccess("Insurance verification request created.");
  }

  async function applyOverride() {
    await postJson(
      `/api/admin/bookings/${bookingId}/insurance/override`,
      {
        reason: overrideReason.trim(),
      },
      "Unable to apply insurance override.",
    );

    setSuccess("Insurance override applied.");
    setOverrideModalOpen(false);
    setOverrideReason("");
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 text-sm text-slate-600">
        <p>Rental channel: {rentalChannel.replaceAll("_", " ")}</p>
        <p>Protection package: {protectionPackage}</p>
        <p>Risk level: {riskLevel ?? "unknown"}</p>
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
        {summary.effectiveDate || summary.expirationDate ? (
          <p>
            Effective dates: {summary.effectiveDate ? summary.effectiveDate.toLocaleDateString() : "Unknown"} to{" "}
            {summary.expirationDate ? summary.expirationDate.toLocaleDateString() : "Unknown"}
          </p>
        ) : null}
        {summary.liabilityLimitsCents != null ? (
          <p>Liability limits: {formatCurrency(summary.liabilityLimitsCents / 100)}</p>
        ) : null}
        {summary.namedInsuredMatch != null ? (
          <p>Named insured match: {summary.namedInsuredMatch ? "Yes" : "No"}</p>
        ) : null}
        {summary.hasComprehensiveCollision != null ? (
          <p>Comp / collision: {summary.hasComprehensiveCollision ? "Present" : "Not confirmed"}</p>
        ) : null}
        {summary.verifiedBy ? <p>Verified by: {summary.verifiedBy}</p> : null}
        {summary.resolvedAt ? <p>Resolved at: {summary.resolvedAt.toLocaleString()}</p> : null}
        {summary.overrideApplied ? (
          <p>
            Override: Applied{summary.overrideBy ? ` by ${summary.overrideBy}` : ""}
            {summary.overrideAt ? ` on ${summary.overrideAt.toLocaleString()}` : ""}
          </p>
        ) : null}
        {summary.overrideReason ? <p>Override reason: {summary.overrideReason}</p> : null}

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

        {summary.approvalReasons?.length ? (
          <div>
            <p className="font-medium text-slate-900">Approval reasons</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {summary.approvalReasons.map((reason) => (
                <span key={reason} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {reason}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-3 border-t border-slate-100 pt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Actions</p>
        {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        {success ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p> : null}
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Carrier name
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
            disabled={isPending || !canFinalize}
            loading={isPending}
            onClick={() => runRequest(() => finalize("verified", [], "Verification approved."))}
          >
            Mark Verified
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isPending || !canFinalize}
            onClick={() => runRequest(() => finalize("rejected", ["admin_rejected"], "Verification rejected."))}
          >
            Reject
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={() =>
              runRequest(() =>
                finalize("unverifiable", ["manual_review_required"], "Verification moved to manual review."),
              )
            }
          >
            Send to Manual Review
          </Button>
          <Button type="button" variant="outline" disabled={isPending} onClick={() => runRequest(requestRereview)}>
            Request Re-Review
          </Button>
          <Button type="button" variant="ghost" disabled={isPending} onClick={() => setOverrideModalOpen(true)}>
            Apply Override
          </Button>
        </div>
      </div>

      <Modal
        description="Overrides are admin-only and require a typed reason for audit and operations."
        onClose={() => {
          if (!isPending) {
            setOverrideModalOpen(false);
          }
        }}
        open={overrideModalOpen}
        title="Apply Insurance Override"
      >
        <div className="space-y-4">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Override reason
            <textarea
              className="min-h-32 rounded-3xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
              value={overrideReason}
              onChange={(event) => setOverrideReason(event.target.value)}
              placeholder="Explain why this booking can proceed despite the insurance block."
              disabled={isPending}
            />
          </label>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" disabled={isPending} onClick={() => setOverrideModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isPending || overrideReason.trim().length < 10}
              onClick={() => runRequest(applyOverride)}
            >
              Confirm Override
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
