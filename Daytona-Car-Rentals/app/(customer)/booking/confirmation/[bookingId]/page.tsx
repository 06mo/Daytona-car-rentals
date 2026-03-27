import Link from "next/link";
import { notFound } from "next/navigation";

import { getBookingById } from "@/lib/services/bookingService";
import { getVehicleById } from "@/lib/services/vehicleService";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";

type PageProps = {
  params: Promise<{ bookingId: string }>;
};

export default async function BookingConfirmationPage({ params }: PageProps) {
  const { bookingId } = await params;
  const booking = await getBookingById(bookingId);

  if (!booking) {
    notFound();
  }

  const vehicle = await getVehicleById(booking.vehicleId);

  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <div className="rounded-[2rem] border border-emerald-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-600">Booking Confirmed</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">Your reservation is in.</h1>
        <p className="mt-4 text-slate-600">
          We&apos;ll review your documents and send a confirmation email before your trip.
        </p>
        <div className="mt-8 grid gap-3 text-sm text-slate-600">
          <p>Booking ID: {booking.id}</p>
          <p>Vehicle: {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : booking.vehicleId}</p>
          <p>Dates: {booking.startDate.toDateString()} to {booking.endDate.toDateString()}</p>
          <p>Deposit paid now: {formatCurrency(booking.pricing.depositAmount / 100)}</p>
          <p>Remaining balance at pickup: {formatCurrency((booking.pricing.totalAmount - booking.pricing.depositAmount) / 100)}</p>
        </div>
        <div className="mt-8 flex gap-3">
          <Button asChild href="/dashboard">View My Bookings</Button>
          <Button asChild href="/" variant="secondary">Back to Home</Button>
        </div>
      </div>
    </section>
  );
}
