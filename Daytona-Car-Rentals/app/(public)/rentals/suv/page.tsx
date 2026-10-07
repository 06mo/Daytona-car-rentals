import Link from "next/link";
import { VehicleCard } from "@/components/fleet/VehicleCard";
import { vehicles } from "@/lib/data/vehicles";
import { createLandingMetadata } from "@/lib/data/localBusinessSchema";
export const metadata = createLandingMetadata(
  "suv",
  "A little more room." + " · Daytona Car Rentals",
  "SUV rentals in Daytona Beach.",
);
export default function RentalPage() {
  return (
    <section className="container page-section">
      <p className="eyebrow">DAYTONA BEACH, FLORIDA</p>
      <h1>A little more room.</h1>
      <p className="page-intro">SUV rentals in Daytona Beach.</p>
      <div className="notice">
        Follow each car’s channel label: request a direct-eligible car when open,
        or book a Turo-only car on its listing. Direct requests require approval.
      </div>
      <div className="car-grid">
        {vehicles
          .filter((v) => v.category === "suv")
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
