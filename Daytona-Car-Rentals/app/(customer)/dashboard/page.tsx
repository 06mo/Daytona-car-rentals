import Link from "next/link";
import { redirect } from "next/navigation";

import { BookingStatusBadge } from "@/components/admin/BookingStatusBadge";
import { VerificationStatusBanner } from "@/components/customer/VerificationStatusBanner";
import { Button } from "@/components/ui/Button";
import { getServerUserId } from "@/lib/auth/getServerUserId";
import { listBookingsForUser } from "@/lib/services/bookingService";
import { getUserVerificationSummary } from "@/lib/services/documentService";
import { getUserProfile } from "@/lib/services/userService";
import { getVehicleById } from "@/lib/services/vehicleService";

export default async function CustomerDashboardPage() {
  const userId = await getServerUserId();

  if (!userId) {
    redirect("/login?returnUrl=%2Fdashboard");
  }

  const [profile, verificationSummary, bookings] = await Promise.all([
    getUserProfile(userId),
    getUserVerificationSummary(userId),
    listBookingsForUser(userId),
  ]);

  if (!profile || !verificationSummary) {
    redirect("/login?returnUrl=%2Fdashboard");
  }

  const upcomingBookings = bookings
    .filter((booking) =>
      booking.status === "pending_verification" || booking.status === "confirmed" || booking.status === "active",
    )
    .sort((first, second) => first.startDate.getTime() - second.startDate.getTime())
    .slice(0, 3);

  const upcomingWithVehicles = await Promise.all(
    upcomingBookings.map(async (booking) => ({
      booking,
      vehicle: await getVehicleById(booking.vehicleId),
    })),
  );

  const activeRental = bookings.find((booking) => booking.status === "active") ?? null;
  const activeRentalVehicle = activeRental ? await getVehicleById(activeRental.vehicleId) : null;

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">Portal</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Welcome back, {profile.displayName}.</h1>
      </div>

      <VerificationStatusBanner status={verificationSummary.verificationStatus} />

      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Upcoming bookings</h2>
            <p className="mt-2 text-sm text-slate-500">Your next Daytona trips, all in one place.</p>
          </div>
          <Button asChild variant="secondary" href="/dashboard/bookings">
            View All
          </Button>
        </div>

        {upcomingWithVehicles.length === 0 ? (
          <div className="mt-6 rounded-[2rem] bg-slate-50 p-6 text-center">
            <p className="text-sm text-slate-600">No upcoming bookings.</p>
            <Link className="mt-3 inline-block text-sm font-semibold text-orange-600 hover:text-orange-700" href="/fleet">
              Browse the fleet →
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            {upcomingWithVehicles.map(({ booking, vehicle }) => (
              <div key={booking.id} className="rounded-[2rem] border border-slate-200 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : booking.vehicleId}
                    </h3>
                    <p className="mt-2 text-sm text-slate-500">
                      {booking.startDate.toLocaleDateString()} - {booking.endDate.toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-col items-start gap-3 lg:items-end">
                    <BookingStatusBadge status={booking.status} />
                    <Link className="text-sm font-semibold text-orange-600 hover:text-orange-700" href={`/dashboard/bookings/${booking.id}`}>
                      View booking
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total bookings</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{bookings.length}</p>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Active rental</p>
          <p className="mt-3 text-xl font-semibold text-slate-900">
            {activeRental && activeRentalVehicle
              ? `${activeRentalVehicle.year} ${activeRentalVehicle.make} ${activeRentalVehicle.model}`
              : "None"}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {activeRental ? `Return ${activeRental.endDate.toLocaleDateString()}` : "Nothing currently on the road."}
          </p>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Member since</p>
          <p className="mt-3 text-xl font-semibold text-slate-900">
            {profile.createdAt.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
          </p>
        </div>
      </div>
    </section>
  );
}
