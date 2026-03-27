import Link from "next/link";
import { redirect } from "next/navigation";

import { ProtectionPackageBadge } from "@/components/booking/ProtectionPackageBadge";
import { BookingStatusBadge } from "@/components/admin/BookingStatusBadge";
import { Button } from "@/components/ui/Button";
import { getServerUserId } from "@/lib/auth/getServerUserId";
import { listBookingsForUser } from "@/lib/services/bookingService";
import { getVehicleById } from "@/lib/services/vehicleService";
import { formatCurrency } from "@/lib/utils";

export default async function CustomerBookingsPage() {
  const userId = await getServerUserId();

  if (!userId) {
    redirect("/login?returnUrl=%2Fdashboard%2Fbookings");
  }

  const bookings = await listBookingsForUser(userId);
  const bookingsWithVehicles = await Promise.all(
    bookings.map(async (booking) => ({
      booking,
      vehicle: await getVehicleById(booking.vehicleId),
    })),
  );

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">Portal</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">My Bookings</h1>
        </div>
        <Button asChild variant="secondary" href="/fleet">
          Browse Fleet
        </Button>
      </div>

      {bookingsWithVehicles.length === 0 ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">You haven&apos;t made any bookings yet.</h2>
          <p className="mt-3 text-slate-500">Browse the fleet when you&apos;re ready for your next trip.</p>
          <div className="mt-6">
            <Button asChild href="/fleet">
              Browse the Fleet
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {bookingsWithVehicles.map(({ booking, vehicle }) => (
            <article key={booking.id} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : booking.vehicleId}
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    {booking.startDate.toLocaleDateString()} - {booking.endDate.toLocaleDateString()}
                  </p>
                  <div className="mt-3">
                    <ProtectionPackageBadge packageId={booking.protectionPackage ?? "standard"} />
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    Charged at booking: {formatCurrency(booking.pricing.depositAmount / 100)}
                  </p>
                </div>
                <div className="flex flex-col items-start gap-3 lg:items-end">
                  <BookingStatusBadge status={booking.status} />
                  <Link className="text-sm font-semibold text-orange-600 hover:text-orange-700" href={`/dashboard/bookings/${booking.id}`}>
                    View details
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
