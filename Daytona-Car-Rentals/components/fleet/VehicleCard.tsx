import Image from "next/image";
import Link from "next/link";
import { Route, Settings2, Users } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { cn, formatCurrency } from "@/lib/utils";
import type { Vehicle } from "@/types";

type VehicleCardProps = {
  vehicle: Vehicle;
  className?: string;
  endDate?: string;
  startDate?: string;
};

function getVehicleImage(vehicle: Vehicle) {
  const primaryImage = vehicle.images[0];

  if (primaryImage?.startsWith("/") || primaryImage?.startsWith("http")) {
    return primaryImage;
  }

  return "/images/vehicle-sedan.svg";
}

function getTotalPrice(vehicle: Vehicle, startDate?: string, endDate?: string) {
  if (!startDate || !endDate) {
    return null;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

  return vehicle.dailyRate * days;
}

export function VehicleCard({ vehicle, className, startDate, endDate }: VehicleCardProps) {
  const bookingUrl =
    startDate && endDate
      ? `/booking/${vehicle.id}?start=${startDate}&end=${endDate}`
      : `/fleet/${vehicle.id}`;
  const totalPrice = getTotalPrice(vehicle, startDate, endDate);

  return (
    <Link href={bookingUrl}>
      <Card className={cn("overflow-hidden border-slate-200 transition hover:-translate-y-1 hover:shadow-xl", className)}>
        <div className="relative aspect-video overflow-hidden">
          <Image alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} className="object-cover" fill src={getVehicleImage(vehicle)} />
          <div className="absolute left-4 top-4">
            <Badge className="bg-white/95 text-slate-900">{vehicle.category}</Badge>
          </div>
        </div>
        <CardContent className="space-y-5 pt-6">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-slate-900">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h3>
            <p className="text-sm text-slate-500">{vehicle.location}</p>
          </div>

          <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 text-orange-500" />
              {vehicle.seats} seats
            </span>
            <span className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-orange-500" />
              {vehicle.transmission}
            </span>
            <span className="flex items-center gap-2">
              <Route className="h-4 w-4 text-orange-500" />
              {vehicle.mileagePolicy === "unlimited" ? "Unlimited miles" : `${vehicle.mileagePolicy} mi/day`}
            </span>
          </div>

          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">From</p>
              <p className="text-2xl font-bold text-orange-500">
                {formatCurrency(vehicle.dailyRate / 100)}
                <span className="ml-1 text-sm font-medium text-slate-500">/day</span>
              </p>
              {totalPrice ? (
                <p className="mt-1 text-sm text-slate-500">Estimated trip total: {formatCurrency(totalPrice / 100)}</p>
              ) : null}
            </div>
            <span className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Book Now</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function VehicleCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="aspect-video animate-pulse bg-slate-200" />
      <div className="space-y-4 p-6">
        <div className="h-5 w-2/3 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200" />
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="h-4 animate-pulse rounded bg-slate-200" />
          <div className="h-4 animate-pulse rounded bg-slate-200" />
          <div className="h-4 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="h-10 w-1/2 animate-pulse rounded bg-slate-200" />
      </div>
    </div>
  );
}
