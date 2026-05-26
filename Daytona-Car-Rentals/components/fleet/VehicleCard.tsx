import Image from "next/image";
import { ExternalLink, Route, Settings2, Users } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { TuroVehicle } from "@/lib/data/vehicles";

type VehicleCardProps = {
  vehicle: TuroVehicle;
  className?: string;
};

export function VehicleCard({ vehicle, className }: VehicleCardProps) {
  return (
    <a href={vehicle.turoUrl} target="_blank" rel="noreferrer">
      <Card className={cn("overflow-hidden border-slate-200 transition hover:-translate-y-1 hover:shadow-xl", className)}>
        <div className="relative aspect-video overflow-hidden">
          <Image
            alt={`${vehicle.year} ${vehicle.color} ${vehicle.make} ${vehicle.model}`}
            className="object-cover"
            fill
            src={vehicle.image}
          />
          <div className="absolute left-4 top-4">
            <Badge className="bg-white/95 text-slate-900 capitalize">{vehicle.category}</Badge>
          </div>
        </div>
        <CardContent className="space-y-5 pt-6">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-900">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h3>
            <p className="text-sm text-slate-500">{vehicle.color} · Daytona Beach, FL</p>
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
              {vehicle.mileage}
            </span>
          </div>

          <div className="flex justify-end">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              Book on Turo
              <ExternalLink className="h-3.5 w-3.5" />
            </span>
          </div>
        </CardContent>
      </Card>
    </a>
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
        <div className="h-8 w-1/3 ml-auto animate-pulse rounded-full bg-slate-200" />
      </div>
    </div>
  );
}
