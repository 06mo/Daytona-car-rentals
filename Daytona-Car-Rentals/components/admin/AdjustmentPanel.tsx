"use client";

import { useState, useTransition } from "react";

import { AddAdjustmentModal } from "@/components/admin/AddAdjustmentModal";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import type { BookingAdjustment } from "@/types";

type AdjustmentPanelProps = {
  baseBalance: number;
  bookingId: string;
  initialAdjustments: BookingAdjustment[];
  initialRemainingBalance: number;
};

type AdjustmentResponse = {
  adjustments: BookingAdjustment[];
  remainingBalance: number;
};

const statusClasses: Record<string, string> = {
  applied: "bg-slate-100 text-slate-700",
  paid: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-800",
  waived: "bg-slate-200 text-slate-600",
};

export function AdjustmentPanel({
  baseBalance,
  bookingId,
  initialAdjustments,
  initialRemainingBalance,
}: AdjustmentPanelProps) {
  const [adjustments, setAdjustments] = useState(initialAdjustments);
  const [remainingBalance, setRemainingBalance] = useState(initialRemainingBalance);
  const [isPending, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function reloadAdjustments() {
    const response = await fetch(`/api/admin/bookings/${bookingId}/adjustments`);
    const data = (await response.json().catch(() => null)) as AdjustmentResponse | { error?: string } | null;

    if (!response.ok || !data || !("adjustments" in data)) {
      throw new Error((data as { error?: string } | null)?.error ?? "Unable to refresh adjustments.");
    }

    setAdjustments(data.adjustments);
    setRemainingBalance(data.remainingBalance);
  }

  function runRequest(action: () => Promise<void>) {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        await action();
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unable to update adjustments.");
      }
    });
  }

  async function requestPayment(adjustmentId: string) {
    const response = await fetch(`/api/admin/bookings/${bookingId}/adjustments/${adjustmentId}/request-payment`, {
      method: "POST",
    });
    const data = (await response.json().catch(() => null)) as { error?: string; paymentLinkUrl?: string | null } | null;

    if (!response.ok) {
      throw new Error(data?.error ?? "Unable to send payment request.");
    }

    await reloadAdjustments();
    setSuccess(data?.paymentLinkUrl ? "Payment request sent to the customer." : "Payment request created.");
  }

  async function waive(adjustmentId: string) {
    const response = await fetch(`/api/admin/bookings/${bookingId}/adjustments/${adjustmentId}/waive`, {
      method: "POST",
    });
    const data = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      throw new Error(data?.error ?? "Unable to waive adjustment.");
    }

    await reloadAdjustments();
    setSuccess("Adjustment waived.");
  }

  return (
    <>
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Adjustments</h2>
            <p className="mt-1 text-sm text-slate-500">Post-booking charges, credits, and extensions stay append-only.</p>
          </div>
          <Button type="button" variant="secondary" disabled={isPending} onClick={() => setIsModalOpen(true)}>
            Add
          </Button>
        </div>

        <div className="mt-4 space-y-4">
          {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
          {success ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p> : null}

          {adjustments.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">No adjustments on this booking.</p>
          ) : (
            <div className="space-y-3">
              {adjustments.map((adjustment) => (
                <div key={adjustment.id} className="rounded-3xl border border-slate-200 px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{adjustment.reason}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {adjustment.customerVisibleNote ?? "Internal-only adjustment"}
                      </p>
                      {adjustment.extensionDetails ? (
                        <p className="mt-2 text-xs text-slate-500">
                          Extension to {new Date(adjustment.extensionDetails.newEndDate).toLocaleDateString()} for{" "}
                          {adjustment.extensionDetails.additionalDays} extra day
                          {adjustment.extensionDetails.additionalDays === 1 ? "" : "s"}.
                        </p>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <p className={`text-base font-semibold ${adjustment.amountCents < 0 ? "text-emerald-700" : "text-slate-900"}`}>
                        {adjustment.amountCents > 0 ? "+" : ""}
                        {formatCurrency(adjustment.amountCents / 100)}
                      </p>
                      <span
                        className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          statusClasses[adjustment.status] ?? "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {adjustment.status}
                      </span>
                    </div>
                  </div>

                  {adjustment.status === "pending" ? (
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={() => runRequest(() => requestPayment(adjustment.id))}>
                        Send payment link
                      </Button>
                      <Button type="button" size="sm" variant="ghost" disabled={isPending} onClick={() => runRequest(() => waive(adjustment.id))}>
                        Waive
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          <div className="rounded-3xl bg-slate-50 px-4 py-4 text-sm text-slate-600">
            <p>Original balance: {formatCurrency(baseBalance / 100)}</p>
            <p className="mt-1 font-semibold text-slate-900">Current remaining balance: {formatCurrency(remainingBalance / 100)}</p>
          </div>
        </div>
      </div>

      <AddAdjustmentModal
        bookingId={bookingId}
        isPending={isPending}
        onClose={() => setIsModalOpen(false)}
        onCreated={(message) =>
          runRequest(async () => {
            await reloadAdjustments();
            setSuccess(message);
          })
        }
        open={isModalOpen}
      />
    </>
  );
}
