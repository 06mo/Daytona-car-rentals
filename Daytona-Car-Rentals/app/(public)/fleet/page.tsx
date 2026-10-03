import type { Metadata } from "next";
import Link from "next/link";
import { VehicleCard } from "@/components/fleet/VehicleCard";
import { vehicles, TURO_HOST_URL } from "@/lib/data/vehicles";
export const metadata: Metadata = {
  title: "Our cars · Daytona Car Rentals",
  description:
    "Explore Daytona's local fleet: cars, SUVs, eight-seat vans and a pickup truck. Choose dates for direct-rental quotes or book through Turo.",
};
const categories = [
  { id: "all", label: "All cars" },
  { id: "economy", label: "Cars" },
  { id: "suv", label: "SUVs" },
  { id: "van", label: "Vans" },
  { id: "truck", label: "Truck" },
];
export default async function FleetPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const active = categories.some((c) => c.id === category) ? category : "all";
  return (
    <section className="container page-section">
      <p className="eyebrow">OUR LOCAL FLEET</p>
      <h1>A car for your kind of trip.</h1>
      <p className="page-intro">
        Choose your dates for a direct-rental quote. Prefer Turo? Each car has
        its own listing.
      </p>
      <nav className="filter-tabs" aria-label="Vehicle categories">
        {categories.map((c) => (
          <Link
            aria-current={active === c.id ? "page" : undefined}
            className={active === c.id ? "active" : ""}
            key={c.id}
            href={c.id === "all" ? "/fleet" : `/fleet?category=${c.id}`}
          >
            {c.label}
          </Link>
        ))}
      </nav>
      <div className="car-grid">
        {vehicles
          .filter((v) => active === "all" || v.category === active)
          .map((v) => (
            <VehicleCard key={v.id} vehicle={v} />
          ))}
      </div>
      <p className="small-note">
        Direct requests are subject to eligibility and a manual calendar check.{" "}
        <a href={TURO_HOST_URL} target="_blank" rel="noreferrer">
          View the fleet on Turo.
        </a>
      </p>
    </section>
  );
}
