import Link from "next/link";
import { VehicleCard } from "@/components/fleet/VehicleCard";
import { vehicles } from "@/lib/data/vehicles";
import { createLandingMetadata } from "@/lib/data/localBusinessSchema";
export const metadata = createLandingMetadata(
  "spring-break",
  "A little sunshine." + " · Daytona Car Rentals",
  "A car for your Daytona break.",
);
export default function RentalPage() {
  return (
    <section className="container page-section">
      <p className="eyebrow">DAYTONA BEACH, FLORIDA</p>
      <h1>A little sunshine.</h1>
      <p className="page-intro">A car for your Daytona break.</p>
      <div className="notice">
        All drivers must meet the approved age, license and insurance
        requirements. Check eligibility before making plans.
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
