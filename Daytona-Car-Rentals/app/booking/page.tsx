import type { Metadata } from "next";
import { BookingWizard } from "@/components/booking/BookingWizard";
import { vehicles } from "@/lib/data/vehicles";
import { isDirectRental } from "@/lib/data/rentalChannels";
import { JourneyLink } from "@/components/journey/JourneyProvider";
import { readJourney } from "@/lib/data/journey";
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
  const selected = vehicles.find((v) => v.id === p.vehicle);
  if (p.vehicle && (!selected || !isDirectRental(p.vehicle))) return <section className="container page-section"><h1>{selected ? "Book this car on Turo" : "Choose a car from the fleet"}</h1><p>This vehicle cannot be requested directly. We have not selected a replacement for you.</p>{selected && <a className="journey-primary" href={selected.turoUrl} target="_blank" rel="noreferrer">Book on Turo</a>} <JourneyLink className="text-link" href="/fleet">Browse cars</JourneyLink></section>;
  return (
    <BookingWizard
      initialPeriod={readJourney(new URLSearchParams(Object.entries(p).filter((entry): entry is [string, string] => typeof entry[1] === "string"))).period || ""}
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
