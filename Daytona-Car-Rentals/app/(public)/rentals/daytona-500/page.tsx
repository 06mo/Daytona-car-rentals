import Link from "next/link";
import { VehicleCard } from "@/components/fleet/VehicleCard";
import { vehicles } from "@/lib/data/vehicles";
import { createLandingMetadata } from "@/lib/data/localBusinessSchema";
export const metadata = createLandingMetadata(
  "daytona-500",
  "Your race-week plans." + " · Daytona Car Rentals",
  "A local car for Daytona 500 week.",
);
export default function RentalPage() {
  return (
    <section className="container page-section">
      <p className="eyebrow">DAYTONA BEACH, FLORIDA</p>
      <h1>Your race-week plans.</h1>
      <p className="page-intro">A local car for Daytona 500 week.</p>
      <div className="notice">
        Book early and check your dates. Event availability and rates are shown
        in your quote.
      </div>
      <div className="car-grid">
        {vehicles.slice(0, 6).map((v) => (
          <VehicleCard key={v.id} vehicle={v} />
        ))}
      </div>
      <p className="small-note">
        Direct-rental requests require manual approval. Turo bookings follow the
        platform’s own terms.{" "}
        <Link href="/contact">Ask about pickup and eligibility.</Link>
      </p>
    </section>
  );
}
