"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { VehicleFilters } from "@/components/fleet/VehicleFilters";
import { VehicleGrid } from "@/components/fleet/VehicleGrid";
import { useVehicles } from "@/lib/hooks/useVehicles";
import { formatBookingDateTime } from "@/lib/utils/bookingDateTime";
import type { FleetFilters, Vehicle, VehicleCategory, VehicleSort } from "@/types";

const defaultFilters: FleetFilters = {
  categories: [],
  minPrice: 25,
  maxPrice: 500,
  minSeats: 0,
  transmission: null,
  startDate: null,
  endDate: null,
  location: null,
};

function parseCategories(categoryParam: string | null) {
  if (!categoryParam) {
    return [];
  }

  return categoryParam.split(",").filter(Boolean) as VehicleCategory[];
}

function readFilters(searchParams: URLSearchParams): FleetFilters {
  return {
    categories: parseCategories(searchParams.get("category")),
    minPrice: Number(searchParams.get("minPrice") ?? defaultFilters.minPrice),
    maxPrice: Number(searchParams.get("maxPrice") ?? defaultFilters.maxPrice),
    minSeats: Number(searchParams.get("minSeats") ?? defaultFilters.minSeats),
    transmission: (searchParams.get("transmission") as FleetFilters["transmission"]) ?? null,
    startDate: searchParams.get("start"),
    endDate: searchParams.get("end"),
    location: searchParams.get("location"),
  };
}

function buildQuery(filters: FleetFilters, sortBy: VehicleSort) {
  const params = new URLSearchParams();

  if (filters.categories.length > 0) {
    params.set("category", filters.categories.join(","));
  }

  if (filters.minPrice !== defaultFilters.minPrice) {
    params.set("minPrice", String(filters.minPrice));
  }

  if (filters.maxPrice !== defaultFilters.maxPrice) {
    params.set("maxPrice", String(filters.maxPrice));
  }

  if (filters.minSeats) {
    params.set("minSeats", String(filters.minSeats));
  }

  if (filters.transmission) {
    params.set("transmission", filters.transmission);
  }

  if (filters.startDate) {
    params.set("start", filters.startDate);
  }

  if (filters.endDate) {
    params.set("end", filters.endDate);
  }

  if (filters.location) {
    params.set("location", filters.location);
  }

  if (sortBy !== "newest") {
    params.set("sort", sortBy);
  }

  return params.toString();
}

export function FleetCatalog({ initialVehicles }: { initialVehicles: Vehicle[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const filters = useMemo(() => readFilters(new URLSearchParams(searchParams.toString())), [searchParams]);
  const sortBy = (searchParams.get("sort") as VehicleSort) ?? "newest";

  const { vehicles, loading } = useVehicles({
    filters,
    initialVehicles,
    sortBy,
  });

  function updateUrl(nextFilters: FleetFilters, nextSort = sortBy) {
    const query = buildQuery(nextFilters, nextSort);

    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }

  function clearFilters() {
    updateUrl(defaultFilters);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">Rental Fleet</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">Find the right vehicle for your Daytona trip.</h1>
        <p className="mt-4 text-lg text-slate-600">
          Filter by category, price, seats, dates, and pickup point to narrow the list fast.
        </p>
      </div>

      {filters.location || (filters.startDate && filters.endDate) ? (
        <div className="mt-6 rounded-[2rem] border border-orange-200 bg-orange-50 px-6 py-4 text-sm text-orange-900">
          <p className="font-semibold">Your search</p>
          <p className="mt-1">
            {filters.location ? `Pickup in ${filters.location}` : "All pickup locations"}
            {filters.startDate && filters.endDate
              ? ` · ${formatBookingDateTime(filters.startDate)} to ${formatBookingDateTime(filters.endDate)}`
              : ""}
          </p>
        </div>
      ) : null}

      <div className="mt-10 grid gap-8 lg:grid-cols-[280px_1fr]">
        <VehicleFilters
          initialFilters={filters}
          isMobileOpen={isMobileOpen}
          onCloseMobile={() => setIsMobileOpen(false)}
          onFiltersChange={(nextFilters) => updateUrl(nextFilters)}
          onOpenMobile={() => setIsMobileOpen(true)}
        />

        <VehicleGrid
          endDate={filters.endDate}
          location={filters.location}
          loading={loading || isPending}
          onClearFilters={clearFilters}
          onSortChange={(nextSort) => updateUrl(filters, nextSort)}
          sortBy={sortBy}
          startDate={filters.startDate}
          vehicles={vehicles}
        />
      </div>
    </div>
  );
}
