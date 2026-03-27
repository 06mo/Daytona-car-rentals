"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

type CustomerCancelPanelProps = {
  bookingId: string;
  canCancel: boolean;
};

export function CustomerCancelPanel({ bookingId, canCancel }: CustomerCancelPanelProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCancel() {
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });
        const data = (await response.json().catch(() => null)) as { error?: string } | null;

        if (!response.ok) {
          throw new Error(data?.error ?? "Unable to cancel booking.");
        }

        setIsOpen(false);
        router.refresh();
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unable to cancel booking.");
      }
    });
  }

  if (!canCancel) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
        <p className="text-sm font-medium text-slate-700">This booking can no longer be cancelled.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Need to change plans?</h3>
          <p className="mt-2 text-sm text-slate-600">
            You can cancel this booking now. Refund timing depends on your payment method and bank.
          </p>
        </div>
        {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        <Button type="button" variant="secondary" onClick={() => setIsOpen(true)}>
          Cancel Booking
        </Button>
      </div>

      <Modal
        open={isOpen}
        onClose={() => {
          if (!isPending) {
            setIsOpen(false);
          }
        }}
        title="Cancel Booking"
        description="Are you sure you want to cancel this booking? This action cannot be undone."
      >
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" disabled={isPending} onClick={() => setIsOpen(false)}>
            Keep Booking
          </Button>
          <Button type="button" disabled={isPending} onClick={handleCancel}>
            Confirm Cancel
          </Button>
        </div>
      </Modal>
    </>
  );
}
