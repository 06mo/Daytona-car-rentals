import { notFound } from "next/navigation";

import { BookingActionsPanel } from "@/components/admin/BookingActionsPanel";
import { BookingStatusBadge } from "@/components/admin/BookingStatusBadge";
import { getBookingTimeline, listAdminUsers, listAdminVehicles } from "@/lib/services/adminService";
import { getBookingById } from "@/lib/services/bookingService";
import { listPartners } from "@/lib/services/partnerService";
import { formatCurrency } from "@/lib/utils";

type PageProps = {
  params: Promise<{ bookingId: string }>;
};

export default async function AdminBookingDetailPage({ params }: PageProps) {
  const { bookingId } = await params;
  const booking = await getBookingById(bookingId);

  if (!booking) {
    notFound();
  }

  const [users, vehicles, partners] = await Promise.all([listAdminUsers(), listAdminVehicles(), listPartners()]);
  const customer = users.find((user) => user.id === booking.userId) ?? null;
  const vehicle = vehicles.find((item) => item.id === booking.vehicleId) ?? null;
  const partner = booking.partnerId ? partners.find((item) => item.id === booking.partnerId) ?? null : null;
  const timeline = getBookingTimeline(booking);
  const customerVerified = customer?.verificationStatus === "verified";
  const statusActions =
    booking.status === "pending_verification" && customerVerified
      ? [{ label: "Confirm Booking", status: "confirmed" as const }]
      : booking.status === "confirmed"
        ? [{ label: "Mark as Active", status: "active" as const }]
        : booking.status === "active"
          ? [{ label: "Mark Completed", status: "completed" as const }]
          : [];
  const actionNote =
    booking.status === "pending_verification" && !customerVerified
      ? "This booking can be confirmed after the customer's verification status is marked as verified."
      : statusActions.length === 0 && ["completed", "cancelled", "payment_failed"].includes(booking.status)
        ? "No further manual actions are available for this booking."
        : null;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">Admin</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Booking Detail</h1>
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Booking Details</h2>
            <div className="mt-4 grid gap-2 text-sm text-slate-600">
              <p>ID: {booking.id}</p>
              <p>Dates: {booking.startDate.toDateString()} - {booking.endDate.toDateString()}</p>
              <p>Location: {booking.pickupLocation}</p>
              <p>Vehicle: {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : booking.vehicleId}</p>
              {booking.referralCode ? (
                <p>
                  Referral: {booking.referralCode} {partner ? `(${partner.name})` : "(unrecognised)"}
                </p>
              ) : null}
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
        </div>
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Customer</h2>
            <div className="mt-4 grid gap-2 text-sm text-slate-600">
              <p>{customer?.displayName ?? booking.userId}</p>
              <p>{customer?.email ?? "No email"}</p>
            </div>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Payment</h2>
            <div className="mt-4 grid gap-2 text-sm text-slate-600">
              <p>Deposit paid: {formatCurrency(booking.pricing.depositAmount / 100)}</p>
              <p>Total: {formatCurrency(booking.pricing.totalAmount / 100)}</p>
              <p>PI ID: {booking.stripePaymentIntentId}</p>
            </div>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Actions</h2>
            <div className="mt-4">
              <BookingActionsPanel
                bookingId={booking.id}
                canCancel={!["active", "completed", "cancelled"].includes(booking.status)}
                note={actionNote}
                statusActions={statusActions}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
