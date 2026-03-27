"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { BookingStatus } from "@/types";

type BookingAction = {
  label: string;
  status: Extract<BookingStatus, "confirmed" | "active" | "completed">;
};

type BookingActionsPanelProps = {
  bookingId: string;
  canCancel: boolean;
  note?: string | null;
  statusActions: BookingAction[];
};

export function BookingActionsPanel({
  bookingId,
  canCancel,
  note = null,
  statusActions,
}: BookingActionsPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function runRequest(action: () => Promise<void>) {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unable to update this booking.");
      }
    });
  }

  async function updateStatus(status: BookingAction["status"], label: string) {
    const response = await fetch("/api/admin/update-booking-status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bookingId,
        status,
      }),
    });

    const data = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      throw new Error(data?.error ?? "Unable to update this booking.");
    }

    setSuccess(`${label} successful.`);
  }

  async function cancelBooking() {
    const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cancellationReason: cancellationReason.trim() || "Cancelled by admin",
      }),
    });

    const data = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      throw new Error(data?.error ?? "Unable to cancel this booking.");
    }

    setSuccess("Booking cancelled and refund requested.");
    setCancelModalOpen(false);
    setCancellationReason("");
  }

  return (
    <>
      <div className="space-y-4">
        {note ? <p className="text-sm text-slate-500">{note}</p> : null}
        {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        {success ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p> : null}
        <div className="flex flex-wrap gap-3">
          {statusActions.map((action) => (
            <Button
              key={action.status}
              type="button"
              variant="secondary"
              disabled={isPending}
              onClick={() => runRequest(() => updateStatus(action.status, action.label))}
            >
              {action.label}
            </Button>
          ))}
          {canCancel ? (
            <Button type="button" variant="ghost" disabled={isPending} onClick={() => setCancelModalOpen(true)}>
              Cancel + Refund
            </Button>
          ) : null}
        </div>
      </div>

      <Modal
        open={cancelModalOpen}
        onClose={() => {
          if (!isPending) {
            setCancelModalOpen(false);
          }
        }}
        title="Cancel Booking"
        description="This will cancel the booking and attempt a Stripe refund when payment has already been captured."
      >
        <div className="space-y-4">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Cancellation note
            <textarea
              className="min-h-28 rounded-3xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
              value={cancellationReason}
              onChange={(event) => setCancellationReason(event.target.value)}
              placeholder="Optional context for the customer and internal records."
              disabled={isPending}
            />
          </label>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" disabled={isPending} onClick={() => setCancelModalOpen(false)}>
              Keep Booking
            </Button>
            <Button type="button" disabled={isPending} onClick={() => runRequest(cancelBooking)}>
              Confirm Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
