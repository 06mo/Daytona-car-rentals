import type { Metadata } from "next";
import Link from "next/link";
import { Check, ChevronLeft, Gauge, Settings2, Users } from "lucide-react";
import { notFound } from "next/navigation";

import { VehicleBookingCard } from "@/components/fleet/VehicleBookingCard";
import { VehicleImageGallery } from "@/components/fleet/VehicleImageGallery";
import { Badge } from "@/components/ui/Badge";
import { getVehicleById } from "@/lib/services/vehicleService";

type PageProps = {
  params: Promise<{
    vehicleId: string;
  }>;
  searchParams: Promise<{
    end?: string;
    location?: string;
    start?: string;
  }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { vehicleId } = await params;
  const vehicle = await getVehicleById(vehicleId);

  if (!vehicle) {
    return {
      title: "Vehicle Not Found — Daytona Car Rentals",
    };
  }

  return {
    title: `${vehicle.year} ${vehicle.make} ${vehicle.model} — Daytona Car Rentals`,
    description: `Rent a ${vehicle.year} ${vehicle.make} ${vehicle.model} in Daytona Beach from $${vehicle.dailyRate / 100}/day. Book online instantly.`,
  };
}

export default async function VehicleDetailPage({ params, searchParams }: PageProps) {
  const { vehicleId } = await params;
  const resolvedSearchParams = await searchParams;
  const vehicle = await getVehicleById(vehicleId);

  if (!vehicle) {
    notFound();
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <Link href="/fleet" className="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-orange-500">
        <ChevronLeft className="h-4 w-4" />
        Back to Fleet
      </Link>

      <div className="grid gap-10 lg:grid-cols-[1.45fr_0.9fr]">
        <div className="space-y-8">
          <VehicleImageGallery images={vehicle.images} make={vehicle.make} model={vehicle.model} />

          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-orange-50 text-orange-600">{vehicle.category}</Badge>
              <Badge className={vehicle.available ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}>
                {vehicle.available ? "Available" : "Currently Unavailable"}
              </Badge>
            </div>
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-900">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h1>
            </div>
          </div>

          <div className="grid gap-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-3">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Seats</p>
                <p className="font-medium text-slate-700">{vehicle.seats} seats</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Settings2 className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Transmission</p>
                <p className="font-medium capitalize text-slate-700">{vehicle.transmission}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Gauge className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Mileage</p>
                <p className="font-medium text-slate-700">
                  {vehicle.mileagePolicy === "unlimited" ? "Unlimited miles" : `${vehicle.mileagePolicy} miles / day`}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 border-t border-slate-200 pt-8">
            <h2 className="text-xl font-semibold text-slate-900">Description</h2>
            <p className="max-w-3xl leading-7 text-slate-600">{vehicle.description}</p>
          </div>

          <div className="space-y-4 border-t border-slate-200 pt-8">
            <h2 className="text-xl font-semibold text-slate-900">Features</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {vehicle.features.map((feature) => (
                <div key={feature} className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
                  <Check className="h-4 w-4 shrink-0 text-orange-500" />
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </div>

        <VehicleBookingCard
          initialEndDate={resolvedSearchParams.end}
          initialLocation={resolvedSearchParams.location}
          initialStartDate={resolvedSearchParams.start}
          vehicle={vehicle}
        />
      </div>
    </section>
  );
}
