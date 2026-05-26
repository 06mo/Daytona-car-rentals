import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";

import { VehicleCard } from "@/components/fleet/VehicleCard";
import { vehicles, TURO_HOST_URL } from "@/lib/data/vehicles";

export const metadata: Metadata = {
  title: "Rental Fleet — Daytona Car Rentals",
  description:
    "Browse economy cars, SUVs, vans, and trucks available in Daytona Beach, FL. Locally owned fleet — book through Turo for instant, insured rentals.",
};

const CATEGORY_LABELS: Record<string, string> = {
  all: "All Vehicles",
  economy: "Economy",
  suv: "SUV",
  van: "Van",
  truck: "Truck",
  luxury: "Luxury",
};

type PageProps = {
  searchParams: Promise<{ category?: string }>;
};

export default async function FleetPage({ searchParams }: PageProps) {
  const { category } = await searchParams;
  const activeCategory = category ?? "all";

  const filtered =
    activeCategory === "all"
      ? vehicles
      : vehicles.filter((v) => v.category === activeCategory);

  const availableCategories = ["all", ...Array.from(new Set(vehicles.map((v) => v.category)))];

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">Our Fleet</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-900">Browse Available Cars</h1>
          <p className="mt-3 max-w-2xl text-slate-600">
            {vehicles.length} vehicles in Daytona Beach, FL — all bookable through Turo.
          </p>
        </div>
        <a
          href={TURO_HOST_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
        >
          View All on Turo
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* Category filter tabs */}
      <div className="mt-10 flex flex-wrap gap-2">
        {availableCategories.map((cat) => (
          <a
            key={cat}
            href={cat === "all" ? "/fleet" : `/fleet?category=${cat}`}
            className={
              activeCategory === cat
                ? "rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                : "rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            }
          >
            {CATEGORY_LABELS[cat] ?? cat}
          </a>
        ))}
      </div>

      {/* Vehicle grid */}
      {filtered.length === 0 ? (
        <div className="mt-10 rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-slate-500">
          No vehicles in this category right now.{" "}
          <a href="/fleet" className="font-semibold text-orange-500 hover:text-orange-600">
            View all vehicles
          </a>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} />
          ))}
        </div>
      )}

      {/* Bottom Turo nudge */}
      <div className="mt-14 rounded-[2rem] border border-orange-200 bg-orange-50 px-8 py-8 text-center">
        <p className="text-lg font-semibold text-slate-900">Ready to book?</p>
        <p className="mt-2 text-sm text-slate-600">
          All vehicles are booked through Turo, which provides full insurance coverage, 24/7 roadside
          assistance, and secure payments.
        </p>
        <a
          href={TURO_HOST_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-orange-500 px-7 py-3 text-sm font-semibold text-white hover:bg-orange-600"
        >
          See All Cars on Turo
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </section>
  );
}
