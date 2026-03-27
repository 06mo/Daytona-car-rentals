import Link from "next/link";
import { redirect } from "next/navigation";

import { ProtectionPackageBadge } from "@/components/booking/ProtectionPackageBadge";
import { BookingStatusBadge } from "@/components/admin/BookingStatusBadge";
import { CustomerCancelPanel } from "@/components/customer/CustomerCancelPanel";
import { getServerUserId } from "@/lib/auth/getServerUserId";
import { getProtectionPackageDefinition } from "@/lib/protection/config";
import { computeRemainingBalance, listCustomerVisibleAdjustments } from "@/lib/services/adjustmentService";
import { getChecklist } from "@/lib/services/checklistService";
import { getBookingTimeline } from "@/lib/services/adminService";
import { getBookingById } from "@/lib/services/bookingService";
import { getVehicleById } from "@/lib/services/vehicleService";
import { formatCurrency } from "@/lib/utils";

type PageProps = {
  params: Promise<{ bookingId: string }>;
};

export default async function CustomerBookingDetailPage({ params }: PageProps) {
  const userId = await getServerUserId();

  if (!userId) {
    redirect("/login?returnUrl=%2Fdashboard%2Fbookings");
  }

  const { bookingId } = await params;
  const booking = await getBookingById(bookingId);

  if (!booking || booking.userId !== userId) {
    redirect("/dashboard/bookings");
  }

  const [vehicle, pickupChecklist, dropoffChecklist, adjustments] = await Promise.all([
    getVehicleById(booking.vehicleId),
    getChecklist(booking.id, "pickup"),
    getChecklist(booking.id, "dropoff"),
    listCustomerVisibleAdjustments(booking.id),
  ]);
  const timeline = getBookingTimeline(booking);
  const protectionPackageId = booking.protectionPackage ?? "standard";
  const protectionPackage = getProtectionPackageDefinition(protectionPackageId);
  const canCancel = !["active", "completed", "cancelled"].includes(booking.status);
  const surchargeAmount = booking.pricing.surchargeAmount ?? 0;
  const discountAmount = booking.pricing.discountAmount ?? 0;
  const appliedRuleNames = booking.pricing.appliedRuleNames ?? [];
  const surchargeLabel =
    surchargeAmount > 0 && appliedRuleNames.filter((name) => !name.includes("Rate (")).length > 1
      ? "Peak season surcharge"
      : "Surcharge";
  const discountLabel =
    discountAmount > 0
      ? appliedRuleNames.find((name) => name.includes("Rate (")) ?? "Long-term discount"
      : "Discount";
  const remainingBalance = computeRemainingBalance(booking, adjustments);
  const statusMessage =
    booking.status === "payment_authorized" && booking.coverageDecisionStatus === "rejected"
      ? "Your deposit has been received, but coverage details still need to be corrected before this booking can be confirmed."
      : booking.status === "payment_authorized"
        ? "Your deposit has been received. We’re still working through the insurance review needed before this booking can be confirmed."
      : booking.status === "insurance_pending"
        ? "Insurance verification is in progress. We’ll update this booking as soon as coverage is cleared."
        : booking.status === "insurance_manual_review"
          ? "This booking needs a manual insurance review before final confirmation."
          : booking.status === "insurance_cleared"
            ? "Insurance is cleared. Final confirmation is the next step."
            : null;

  return (
    <section className="space-y-6">
      {statusMessage ? (
        <div className="rounded-[2rem] border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-800">
          {statusMessage}
        </div>
      ) : null}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">Portal</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Booking Detail</h1>
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Booking Info</h2>
            <div className="mt-4 grid gap-2 text-sm text-slate-600">
              <p>ID: {booking.id}</p>
              <p>Vehicle: {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : booking.vehicleId}</p>
              <p>Dates: {booking.startDate.toDateString()} - {booking.endDate.toDateString()}</p>
              <p>Pickup: {booking.pickupLocation}</p>
              <p>Return: {booking.returnLocation}</p>
              <div className="pt-2">
                <ProtectionPackageBadge packageId={protectionPackageId} />
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Status Timeline</h2>
            <div className="mt-4 grid gap-4">
              {timeline.map((item) => (
                <div key={`${item.label}-${item.time.toISOString()}`} className="flex items-start gap-3 text-sm text-slate-600">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-orange-500" />
                  <div>
                    <p className="font-medium text-slate-900">{item.label}</p>
                    <p>{item.time.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Protection</h2>
            <div className="mt-4 grid gap-2 text-sm text-slate-600">
              <p>{protectionPackage.name}</p>
              <p>{protectionPackage.liabilityLabel}</p>
              <p>Protection total: {formatCurrency(booking.pricing.protectionAmount / 100)}</p>
              <p>Coverage decision: {booking.coverageDecisionStatus ?? "not evaluated"}</p>
              <p>Coverage source: {booking.coverageSource ?? "none"}</p>
              <p>Insurance status: {booking.insuranceVerificationStatus ?? "unsubmitted"}</p>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Pricing Summary</h2>
            <div className="mt-4 grid gap-2 text-sm text-slate-600">
              {surchargeAmount > 0 ? <p>{surchargeLabel}: +{formatCurrency(surchargeAmount / 100)}</p> : null}
              {discountAmount > 0 ? <p>{discountLabel}: -{formatCurrency(discountAmount / 100)}</p> : null}
              <p>Extras: {formatCurrency(booking.pricing.extrasAmount / 100)}</p>
              <p>Protection: {formatCurrency(booking.pricing.protectionAmount / 100)}</p>
              <p>Deposit paid: {formatCurrency(booking.pricing.depositAmount / 100)}</p>
              <p>Total: {formatCurrency(booking.pricing.totalAmount / 100)}</p>
              <p>Balance due at pickup: {formatCurrency(remainingBalance / 100)}</p>
            </div>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Adjustments</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              {adjustments.length === 0 ? <p>No customer-visible adjustments on this booking.</p> : null}
              {adjustments.map((adjustment) => (
                <div key={adjustment.id} className="rounded-3xl border border-slate-200 px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{adjustment.customerVisibleNote ?? adjustment.reason}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">{adjustment.status}</p>
                    </div>
                    <p className={`font-semibold ${adjustment.amountCents < 0 ? "text-emerald-700" : "text-slate-900"}`}>
                      {adjustment.amountCents > 0 ? "+" : ""}
                      {formatCurrency(adjustment.amountCents / 100)}
                    </p>
                  </div>
                  {adjustment.status === "pending" && adjustment.stripePaymentLinkUrl ? (
                    <a
                      className="mt-3 inline-flex font-semibold text-orange-600 hover:text-orange-700"
                      href={adjustment.stripePaymentLinkUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Pay this adjustment
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Checklists</h2>
            <div className="mt-4 grid gap-3 text-sm text-slate-600">
              <div>
                <p>Pickup: {pickupChecklist?.status ?? "Not available yet"}</p>
                {pickupChecklist?.status === "submitted" ? (
                  <Link className="font-semibold text-orange-600 hover:text-orange-700" href={`/dashboard/bookings/${booking.id}/checklist/pickup`}>
                    View pickup checklist
                  </Link>
                ) : null}
              </div>
              <div>
                <p>Dropoff: {dropoffChecklist?.status ?? "Not available yet"}</p>
                {dropoffChecklist?.status === "submitted" ? (
                  <Link className="font-semibold text-orange-600 hover:text-orange-700" href={`/dashboard/bookings/${booking.id}/checklist/dropoff`}>
                    View dropoff checklist
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Current Status</h2>
            <div className="mt-4">
              <BookingStatusBadge status={booking.status} />
            </div>
          </div>
          <CustomerCancelPanel bookingId={booking.id} canCancel={canCancel} />
        </div>
      </div>
    </section>
  );
}
