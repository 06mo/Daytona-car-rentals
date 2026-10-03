import Link from "next/link";
import { VehicleCard } from "@/components/fleet/VehicleCard";
import { vehicles } from "@/lib/data/vehicles";
import { createLandingMetadata } from "@/lib/data/localBusinessSchema";
export const metadata = createLandingMetadata(
  "bike-week",
  "Get around Bike Week." + " · Daytona Car Rentals",
  "Local cars for a busy Daytona week.",
);
export default function RentalPage() {
  return (
    <section className="container page-section">
      <p className="eyebrow">DAYTONA BEACH, FLORIDA</p>
      <h1>Get around Bike Week.</h1>
      <p className="page-intro">Local cars for a busy Daytona week.</p>
      <div className="notice">
        Pick your dates and leave room for pickup and traffic. Car rentals do
        not permit racing or unauthorized use.
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
