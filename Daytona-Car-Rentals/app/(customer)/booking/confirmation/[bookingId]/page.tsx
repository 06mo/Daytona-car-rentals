import Link from "next/link";
import { notFound } from "next/navigation";

import { ClearBookingDraftOnMount } from "@/components/booking/ClearBookingDraftOnMount";
import { getBookingById } from "@/lib/services/bookingService";
import { getVehicleById } from "@/lib/services/vehicleService";
import { formatBookingDateTime } from "@/lib/utils/bookingDateTime";
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
  const isFinalConfirmation = booking.status === "confirmed";
  const eyebrow = isFinalConfirmation ? "Booking Confirmed" : "Payment Received";
  const title = isFinalConfirmation ? "Your reservation is in." : "Your payment is secured.";
  const message = isFinalConfirmation
    ? "We've confirmed your booking and will see you soon."
    : "We're reviewing coverage requirements now and will send your final confirmation as soon as insurance is cleared.";

  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <ClearBookingDraftOnMount vehicleId={booking.vehicleId} />
      <div className="rounded-[2rem] border border-emerald-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-600">{eyebrow}</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-4 text-slate-600">{message}</p>
        <div className="mt-8 grid gap-3 text-sm text-slate-600">
          <p>Booking ID: {booking.id}</p>
          <p>Vehicle: {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : booking.vehicleId}</p>
          <p>Dates: {formatBookingDateTime(booking.startDate)} to {formatBookingDateTime(booking.endDate)}</p>
          <p>Pick-up / Return: {booking.pickupLocation}</p>
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
