import Image from "next/image";
import Link from "next/link";
import { Users, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TuroVehicle } from "@/lib/data/vehicles";
export function VehicleCard({
  vehicle,
  className,
}: {
  vehicle: TuroVehicle;
  className?: string;
}) {
  return (
    <article className={cn("car-card", className)}>
      <Link className="car-image" href={`/fleet/${vehicle.id}`}>
        <Image
          src={vehicle.image}
          alt={`${vehicle.color} ${vehicle.make} ${vehicle.model}`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1000px) 50vw, 33vw"
        />
        <span>
          {vehicle.category === "economy"
            ? "Everyday escape"
            : vehicle.category === "van"
              ? "Bring everyone"
              : vehicle.category === "truck"
                ? "Room to roam"
                : "Extra room"}
        </span>
      </Link>
      <div className="car-content">
        <small>
          {vehicle.year} · {vehicle.color}
        </small>
        <h3>
          <Link href={`/fleet/${vehicle.id}`}>
            {vehicle.make} {vehicle.model}
          </Link>
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
        <div className="car-actions">
          <Link href={`/booking?vehicle=${vehicle.id}`} className="text-link">
            Choose dates
          </Link>
          <a href={vehicle.turoUrl} target="_blank" rel="noreferrer">
            Turo
          </a>
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
