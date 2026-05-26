import Link from "next/link";

import { VehicleCard } from "@/components/fleet/VehicleCard";
import type { TuroVehicle } from "@/lib/data/vehicles";

type LandingVehicleSectionProps = {
  heading: string;
  body: string;
  vehicles: TuroVehicle[];
};

export function LandingVehicleSection({ heading, body, vehicles }: LandingVehicleSectionProps) {
  return (
    <section className="mx-auto max-w-6xl px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{heading}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">{body}</p>
        </div>
        <Link
          href="/fleet"
          className="shrink-0 rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          See all vehicles
        </Link>
      </div>

      {vehicles.length === 0 ? (
        <div className="mt-6 rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-slate-500 shadow-sm">
          Browse the full fleet for the latest availability.
        </div>
      ) : (
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          {vehicles.slice(0, 3).map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} />
          ))}
        </div>
      )}
    </section>
  );
}
