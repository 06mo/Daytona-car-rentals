import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { vehicles } from "@/lib/data/vehicles";
import { Button } from "@/components/ui/Button";
export async function generateStaticParams() {
  return vehicles.map((v) => ({ vehicleId: v.id }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ vehicleId: string }>;
}) {
  const { vehicleId } = await params;
  const v = vehicles.find((v) => v.id === vehicleId);
  return {
    title: v
      ? `${v.make} ${v.model} · Daytona Car Rentals`
      : "Vehicle not found",
  };
}
export default async function VehiclePage({
  params,
}: {
  params: Promise<{ vehicleId: string }>;
}) {
  const { vehicleId } = await params;
  const v = vehicles.find((v) => v.id === vehicleId);
  if (!v) notFound();
  return (
    <section className="container page-section">
      <Link className="text-link" href="/fleet">
        All cars
      </Link>
      <div className="detail-grid">
        <div className="detail-image">
          <Image
            src={v.image}
            alt={`${v.color} ${v.make} ${v.model}`}
            fill
            priority
            sizes="(max-width: 800px) 100vw, 60vw"
          />
        </div>
        <div>
          <p className="eyebrow">
            {v.year} · {v.color}
          </p>
          <h1>
            {v.make} {v.model}
          </h1>
          <p className="page-intro">
            {v.seats} seats · {v.transmission}
            <br />
            Daytona Beach appointment pickup
          </p>
          <p>
            Choose your dates to see a direct-rental quote and mileage policy.
            All direct requests require approval.
          </p>
          <div className="detail-actions">
            <Button asChild href={`/booking?vehicle=${v.id}`}>
              Choose dates
            </Button>
            <a
              className="text-link"
              href={v.turoUrl}
              target="_blank"
              rel="noreferrer"
            >
              Book on Turo
            </a>
          </div>
          <p className="small-note">
            Turo prices, mileage and protection options are separate and shown
            on the platform.
          </p>
        </div>
      </div>
    </section>
  );
}
