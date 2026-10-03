import Link from "next/link";
import { VehicleCard } from "@/components/fleet/VehicleCard";
import { vehicles } from "@/lib/data/vehicles";
import { createLandingMetadata } from "@/lib/data/localBusinessSchema";
export const metadata = createLandingMetadata(
  "daytona-beach-airport",
  "DAB airport delivery" + " · Daytona Car Rentals",
  "Plan your arrival. We\u2019ll arrange the car.",
);
export default function RentalPage() {
  return (
    <section className="container page-section">
      <p className="eyebrow">DAYTONA BEACH, FLORIDA</p>
      <h1>DAB airport delivery</h1>
      <p className="page-intro">Plan your arrival. We’ll arrange the car.</p>
      <div className="notice">
        Delivery and the exact meeting point must be confirmed before arrival.
        Direct delivery is subject to approved airport arrangements; local
        appointment pickup is also available.
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
