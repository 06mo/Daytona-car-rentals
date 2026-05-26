import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Check, ChevronLeft, ExternalLink, Route, Settings2, Users } from "lucide-react";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/Badge";
import { vehicles } from "@/lib/data/vehicles";
import { formatCurrency } from "@/lib/utils";

type PageProps = {
  params: Promise<{ vehicleId: string }>;
};

export async function generateStaticParams() {
  return vehicles.map((v) => ({ vehicleId: v.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { vehicleId } = await params;
  const vehicle = vehicles.find((v) => v.id === vehicleId);

  if (!vehicle) {
    return { title: "Vehicle Not Found — Daytona Car Rentals" };
  }

  return {
    title: `${vehicle.year} ${vehicle.make} ${vehicle.model} — Daytona Car Rentals`,
    description: `Rent a ${vehicle.year} ${vehicle.color} ${vehicle.make} ${vehicle.model} in Daytona Beach from ${formatCurrency(vehicle.dailyRateFrom / 100)}/day. Book through Turo.`,
  };
}

export default async function VehicleDetailPage({ params }: PageProps) {
  const { vehicleId } = await params;
  const vehicle = vehicles.find((v) => v.id === vehicleId);

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
        {/* Left column */}
        <div className="space-y-8">
          {/* Image */}
          <div className="relative aspect-video overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-100">
            <Image
              alt={`${vehicle.year} ${vehicle.color} ${vehicle.make} ${vehicle.model}`}
              className="object-cover"
              fill
              priority
              src={vehicle.image}
            />
          </div>

          {/* Title & badges */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-orange-50 text-orange-600 capitalize">{vehicle.category}</Badge>
              <Badge className="bg-emerald-50 text-emerald-600">Available on Turo</Badge>
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h1>
            <p className="text-slate-500">{vehicle.color} · Daytona Beach, FL</p>
          </div>

          {/* Specs */}
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
                <p className="font-medium text-slate-700">{vehicle.transmission}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Route className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Mileage</p>
                <p className="font-medium text-slate-700">{vehicle.mileage}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-3 border-t border-slate-200 pt-8">
            <h2 className="text-xl font-semibold text-slate-900">About This Car</h2>
            <p className="max-w-3xl leading-7 text-slate-600">{vehicle.description}</p>
          </div>

          {/* Features */}
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

        {/* Right column — booking card */}
        <div>
          <div className="sticky top-24 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Starting from</p>
            <p className="mt-1 text-4xl font-bold text-orange-500">
              {formatCurrency(vehicle.dailyRateFrom / 100)}
              <span className="ml-1 text-base font-medium text-slate-500">/day</span>
            </p>
            <p className="mt-1 text-xs text-slate-400">Final price set by Turo based on your dates</p>

            <a
              href={vehicle.turoUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-orange-500 py-3.5 text-base font-semibold text-white shadow-md transition hover:bg-orange-600"
            >
              Book This Car on Turo
              <ExternalLink className="h-4 w-4" />
            </a>

            <div className="mt-6 space-y-3 border-t border-slate-100 pt-5 text-sm text-slate-600">
              <div className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span>Full insurance included via Turo's protection plans</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span>24/7 roadside assistance on every trip</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span>Instant booking confirmation</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span>Secure payment through Turo</span>
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-slate-400">
              Questions?{" "}
              <Link href="/contact" className="underline underline-offset-2 hover:text-slate-700">
                Contact us
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
