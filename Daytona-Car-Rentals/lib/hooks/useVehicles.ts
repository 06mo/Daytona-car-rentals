"use client";

import { useEffect, useMemo, useState } from "react";

import type { FleetFilters, Vehicle, VehicleSort } from "@/types";

type UseVehiclesOptions = {
  filters: FleetFilters;
  initialVehicles: Vehicle[];
  sortBy: VehicleSort;
};

export function useVehicles({ filters, initialVehicles, sortBy }: UseVehiclesOptions) {
  const [loading, setLoading] = useState(true);
  const [unavailableVehicleIds, setUnavailableVehicleIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadAvailability() {
      if (!filters.startDate || !filters.endDate) {
        setUnavailableVehicleIds([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const response = await fetch("/api/vehicles/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startDate: filters.startDate,
            endDate: filters.endDate,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch availability.");
        }

        const data = (await response.json()) as { unavailableVehicleIds?: string[] };

        if (!cancelled) {
          setUnavailableVehicleIds(data.unavailableVehicleIds ?? []);
        }
      } catch {
        if (!cancelled) {
          setUnavailableVehicleIds([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAvailability();

    return () => {
      cancelled = true;
    };
  }, [filters.endDate, filters.startDate]);

  const vehicles = useMemo(() => {
    const filtered = initialVehicles.filter((vehicle) => {
      const pricePerDay = vehicle.dailyRate / 100;
      const matchesCategory = filters.categories.length === 0 || filters.categories.includes(vehicle.category);
      const matchesPrice = pricePerDay >= filters.minPrice && pricePerDay <= filters.maxPrice;
      const matchesSeats = vehicle.seats >= filters.minSeats;
      const matchesTransmission = !filters.transmission || vehicle.transmission === filters.transmission;
      const matchesLocation = !filters.location || vehicle.location === filters.location;
      const matchesAvailability = !unavailableVehicleIds.includes(vehicle.id);

      return (
        matchesCategory &&
        matchesPrice &&
        matchesSeats &&
        matchesTransmission &&
        matchesLocation &&
        matchesAvailability
      );
    });

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "price_asc":
          return a.dailyRate - b.dailyRate;
        case "price_desc":
          return b.dailyRate - a.dailyRate;
        case "newest":
        default:
          return b.createdAt.getTime() - a.createdAt.getTime();
      }
    });
  }, [filters, initialVehicles, sortBy, unavailableVehicleIds]);

  return {
    vehicles,
    loading,
    unavailableVehicleIds,
  };
}
