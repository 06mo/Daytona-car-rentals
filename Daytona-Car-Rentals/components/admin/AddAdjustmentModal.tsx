"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { AdjustmentType } from "@/types";

type AddAdjustmentModalProps = {
  bookingId: string;
  isPending: boolean;
  onClose: () => void;
  onCreated: (message: string) => void;
  open: boolean;
};

const adjustmentTypes: { label: string; value: AdjustmentType }[] = [
  { label: "Extension", value: "extension" },
  { label: "Fee", value: "fee" },
  { label: "Credit", value: "credit" },
  { label: "Correction", value: "correction" },
];

export function AddAdjustmentModal({ bookingId, isPending, onClose, onCreated, open }: AddAdjustmentModalProps) {
  const [type, setType] = useState<AdjustmentType>("fee");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [customerVisibleNote, setCustomerVisibleNote] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [requestPaymentNow, setRequestPaymentNow] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setType("fee");
      setAmount("");
      setReason("");
      setCustomerVisibleNote("");
      setNewEndDate("");
      setRequestPaymentNow(false);
      setIsSubmitting(false);
      setError(null);
    }
  }, [open]);

  const showsAmount = type !== "extension";
  const paymentEligible = type === "fee" || type === "extension" || (type === "correction" && Number(amount) > 0);

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/adjustments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          amountCents: showsAmount && amount ? Math.round(Number(amount) * 100) : undefined,
          reason,
          customerVisibleNote,
          newEndDate: type === "extension" ? newEndDate : undefined,
          requestPaymentNow: paymentEligible ? requestPaymentNow : false,
        }),
      });

      const data = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setError(data?.error ?? "Unable to create adjustment.");
        return;
      }

      onCreated(requestPaymentNow ? "Adjustment created and payment request sent." : "Adjustment created.");
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!isPending) {
          onClose();
        }
      }}
      title="Add Adjustment"
      description="Create an append-only booking adjustment. Extensions are priced server-side from the updated return date."
    >
      <div className="space-y-4">
        {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Type
          <select
            className="rounded-3xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
            disabled={isPending}
            value={type}
            onChange={(event) => setType(event.target.value as AdjustmentType)}
          >
            {adjustmentTypes.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {showsAmount ? (
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Amount
            <input
              className="rounded-3xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
              disabled={isPending}
              onChange={(event) => setAmount(event.target.value)}
              placeholder={type === "credit" ? "-25.00" : "25.00"}
              step="0.01"
              type="number"
              value={amount}
            />
          </label>
        ) : null}

        {type === "extension" ? (
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            New return date
            <input
              className="rounded-3xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
              disabled={isPending}
              onChange={(event) => setNewEndDate(event.target.value)}
              type="date"
              value={newEndDate}
            />
          </label>
        ) : null}

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Internal reason
          <textarea
            className="min-h-24 rounded-3xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
            disabled={isPending}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Damage fee, extension approved by phone, goodwill credit, etc."
            value={reason}
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Customer note
          <textarea
            className="min-h-24 rounded-3xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
            disabled={isPending}
            onChange={(event) => setCustomerVisibleNote(event.target.value)}
            placeholder="Optional note shown in the customer portal and payment email."
            value={customerVisibleNote}
          />
        </label>

        {paymentEligible ? (
          <label className="flex items-start gap-3 rounded-3xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
            <input
              checked={requestPaymentNow}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
              disabled={isPending}
              onChange={(event) => setRequestPaymentNow(event.target.checked)}
              type="checkbox"
            />
            <span>Request payment immediately and email the Stripe checkout link to the customer.</span>
          </label>
        ) : null}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" disabled={isPending} onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isSubmitting || isPending}
            loading={isSubmitting || isPending}
            onClick={handleSubmit}
          >
            Create Adjustment
          </Button>
        </div>
      </div>
    </Modal>
  );
}
