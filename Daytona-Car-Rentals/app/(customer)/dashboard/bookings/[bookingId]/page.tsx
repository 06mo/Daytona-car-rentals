import { redirect } from "next/navigation";

import { BookingStatusBadge } from "@/components/admin/BookingStatusBadge";
import { CustomerCancelPanel } from "@/components/customer/CustomerCancelPanel";
import { getServerUserId } from "@/lib/auth/getServerUserId";
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

  const vehicle = await getVehicleById(booking.vehicleId);
  const timeline = getBookingTimeline(booking);
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

  return (
    <section className="space-y-6">
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
            <h2 className="text-lg font-semibold text-slate-900">Pricing Summary</h2>
            <div className="mt-4 grid gap-2 text-sm text-slate-600">
              {surchargeAmount > 0 ? <p>{surchargeLabel}: +{formatCurrency(surchargeAmount / 100)}</p> : null}
              {discountAmount > 0 ? <p>{discountLabel}: -{formatCurrency(discountAmount / 100)}</p> : null}
              <p>Deposit paid: {formatCurrency(booking.pricing.depositAmount / 100)}</p>
              <p>Total: {formatCurrency(booking.pricing.totalAmount / 100)}</p>
              <p>Balance due at pickup: {formatCurrency((booking.pricing.totalAmount - booking.pricing.depositAmount) / 100)}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
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
