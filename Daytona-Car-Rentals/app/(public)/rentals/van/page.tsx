import Link from "next/link";
import { VehicleCard } from "@/components/fleet/VehicleCard";
import { vehicles } from "@/lib/data/vehicles";
import { createLandingMetadata } from "@/lib/data/localBusinessSchema";
export const metadata = createLandingMetadata(
  "van",
  "Bring the whole crew." + " · Daytona Car Rentals",
  "Eight-seat vans for your Daytona plans.",
);
export default function RentalPage() {
  return (
    <section className="container page-section">
      <p className="eyebrow">DAYTONA BEACH, FLORIDA</p>
      <h1>Bring the whole crew.</h1>
      <p className="page-intro">Eight-seat vans for your Daytona plans.</p>
      <div className="notice">
        The Kia Carnival seats eight. Talk to us about luggage space before
        selecting your car.
      </div>
      <div className="car-grid">
        {vehicles
          .filter((v) => v.category === "van")
          .slice(0, 6)
          .map((v) => (
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
