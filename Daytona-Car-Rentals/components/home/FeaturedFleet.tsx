import { Button } from "@/components/ui/Button";
import { VehicleCard } from "@/components/fleet/VehicleCard";
import { featuredVehicles } from "@/lib/data/vehicles";

export function FeaturedFleet() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">Featured Fleet</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Our Most Popular Rides</h2>
          <p className="mt-3 max-w-2xl text-slate-600">Hand-picked for comfort, style, and value. All available to book now on Turo.</p>
        </div>
        <Button asChild variant="secondary" href="/fleet">
          Browse Full Fleet
        </Button>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {featuredVehicles.map((vehicle) => (
          <VehicleCard key={vehicle.id} vehicle={vehicle} />
        ))}
      </div>
    </section>
  );
}
