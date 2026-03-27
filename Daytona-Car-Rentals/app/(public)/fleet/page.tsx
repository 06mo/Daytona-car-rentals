import type { Metadata } from "next";
import { Suspense } from "react";

import { FleetCatalog } from "@/components/fleet/FleetCatalog";
import { listVehicles } from "@/lib/services/vehicleService";

export const metadata: Metadata = {
  title: "Rental Fleet — Daytona Car Rentals",
  description:
    "Browse economy, SUV, luxury, and van rentals in Daytona Beach. Filter by price, seats, and dates. Instant online booking.",
};

export default async function FleetPage() {
  const vehicles = await listVehicles({ available: true });

  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-6 py-16 text-slate-500">Loading fleet...</div>}>
      <FleetCatalog initialVehicles={vehicles} />
    </Suspense>
  );
}
