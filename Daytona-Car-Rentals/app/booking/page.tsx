import type { Metadata } from "next";
import { BookingWizard } from "@/components/booking/BookingWizard";
import { vehicles } from "@/lib/data/vehicles";
export const metadata: Metadata = {
  title: "Choose · Verify · Review | Daytona Car Rentals",
  robots: { index: false, follow: false },
};
export default async function BookingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const p = await searchParams;
  return (
    <BookingWizard
      initial={{
        vehicleId: vehicles.some((v) => v.id === p.vehicle)
          ? p.vehicle
          : undefined,
        start: p.start?.slice(0, 16),
        end: p.end?.slice(0, 16),
        location: p.location === "airport" ? "airport" : "local",
      }}
    />
  );
}
