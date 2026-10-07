import Image from "next/image";
import { JourneyLink } from "@/components/journey/JourneyProvider";
import { isDirectRental } from "@/lib/data/rentalChannels";
import { Users, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TuroVehicle } from "@/lib/data/vehicles";
export function VehicleCard({
  vehicle,
  className,
  showFeatures = false,
}: {
  vehicle: TuroVehicle;
  className?: string;
  showFeatures?: boolean;
}) {
  return (
    <article data-vehicle={vehicle.id} className={cn("car-card", className)}>
      <JourneyLink className="car-image" href={`/fleet/${vehicle.id}`}>
        <Image
          src={vehicle.image}
          alt={`${vehicle.color} ${vehicle.make} ${vehicle.model}`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1000px) 50vw, 33vw"
        />
        <span>
          {isDirectRental(vehicle.id) ? "Direct rental" : "Book on Turo"}
        </span>
      </JourneyLink>
      <div className="car-content">
        <small>
          {vehicle.year} · {vehicle.color}
        </small>
        <h3>
          <JourneyLink href={`/fleet/${vehicle.id}`}>
            {vehicle.make} {vehicle.model}
          </JourneyLink>
        </h3>
        <div className="car-specs">
          <span>
            <Users size={16} />
            {vehicle.seats} seats
          </span>
          <span>
            <Settings2 size={16} />
            {vehicle.transmission}
          </span>
        </div>
        {showFeatures && <p className="comparison-features">{vehicle.features.join(" · ")}</p>}
        <div className="car-actions">
          {isDirectRental(vehicle.id) ? <JourneyLink href="/booking" changes={{ vehicle: vehicle.id }} className="text-link">Request this car</JourneyLink> : <a className="text-link" href={vehicle.turoUrl} target="_blank" rel="noreferrer">Book on Turo ↗</a>}
          <JourneyLink href={`/fleet/${vehicle.id}`} changes={{ vehicle: vehicle.id }}>Details</JourneyLink>
        </div>
      </div>
    </article>
  );
}
export function VehicleCardSkeleton() {
  return (
    <div
      className="car-card animate-pulse h-96 bg-slate-100"
      aria-label="Loading vehicle"
    />
  );
}
