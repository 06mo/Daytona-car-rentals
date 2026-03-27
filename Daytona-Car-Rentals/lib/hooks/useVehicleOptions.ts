"use client";

import { useEffect, useState } from "react";

import { defaultVehicleOptions } from "@/lib/data/vehicleOptions";
import type { VehicleOptions } from "@/types";

export function useVehicleOptions() {
  const [options, setOptions] = useState<VehicleOptions>(defaultVehicleOptions);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      try {
        const response = await fetch("/api/vehicle-options", {
          cache: "no-store",
        });
        const data = (await response.json()) as { options?: VehicleOptions };

        if (!cancelled && data.options) {
          setOptions(data.options);
        }
      } catch {
        // Keep fallback defaults when the request fails.
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    featurePresets: options.featurePresets,
    loading,
    locations: options.locations,
    options,
  };
}
