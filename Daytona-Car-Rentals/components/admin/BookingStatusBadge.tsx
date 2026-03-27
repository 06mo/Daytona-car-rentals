import { Badge } from "@/components/ui/Badge";
import type { BookingStatus } from "@/types";

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const classes: Record<BookingStatus, string> = {
    pending_verification: "bg-amber-50 text-amber-700",
    pending_payment: "bg-slate-100 text-slate-700",
    payment_authorized: "bg-blue-50 text-blue-700",
    insurance_pending: "bg-yellow-50 text-yellow-700",
    insurance_manual_review: "bg-orange-50 text-orange-700",
    insurance_cleared: "bg-teal-50 text-teal-700",
    confirmed: "bg-sky-50 text-sky-700",
    active: "bg-emerald-50 text-emerald-700",
    completed: "bg-slate-900 text-white",
    cancelled: "bg-red-50 text-red-700",
    payment_failed: "bg-rose-50 text-rose-700",
  };

  return <Badge className={classes[status]}>{status.replaceAll("_", " ")}</Badge>;
}
