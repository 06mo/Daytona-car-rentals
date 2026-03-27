import Link from "next/link";

import { VehicleCard } from "@/components/fleet/VehicleCard";
import { Button } from "@/components/ui/Button";
import { listVehicles } from "@/lib/services/vehicleService";

export async function FeaturedFleet() {
  try {
    const vehicles = (await listVehicles({ available: true })).slice(0, 3);

    if (vehicles.length === 0) {
      return <FeaturedFleetFallback message="Fresh inventory is loading. Browse the full fleet to see everything currently available." />;
    }

    return (
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">Featured Fleet</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Our Most Popular Rides</h2>
            <p className="mt-3 max-w-2xl text-slate-600">Hand-picked for comfort, style, and value.</p>
          </div>
          <Button asChild variant="secondary" href="/fleet">
            Browse Full Fleet
          </Button>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {vehicles.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} />
          ))}
        </div>
      </section>
    );
  } catch (error) {
    console.error("Featured fleet failed to load.", error);

    return <FeaturedFleetFallback message="Featured vehicles are temporarily unavailable, but the rest of the site is ready to explore." />;
  }
}

function FeaturedFleetFallback({ message }: { message: string }) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">Featured Fleet</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Our Most Popular Rides</h2>
          <p className="mt-3 max-w-2xl text-slate-600">{message}</p>
        </div>
        <Button asChild variant="secondary" href="/fleet">
          Browse Full Fleet
        </Button>
      </div>

      <div className="mt-10 rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 p-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Fleet Preview Unavailable</p>
          <p className="mt-3 text-base leading-7 text-slate-600">
            Vehicle cards could not be loaded right now. You can still continue to the full fleet page and try again there.
          </p>
          <div className="mt-6">
            <Link className="text-sm font-semibold text-orange-600 transition hover:text-orange-700" href="/fleet">
              View available vehicles
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
