import "server-only";

import type { Vehicle, VehicleFilters } from "@/types";
import { FirebaseConfigError, getDocument, listDocuments } from "@/lib/firebase/firestore";
import { mockVehicles } from "@/lib/data/mockVehicles";

export async function getVehicleById(vehicleId: string) {
  try {
    const vehicle = await getDocument<Vehicle>(`vehicles/${vehicleId}`);

    if (vehicle) {
      return vehicle;
    }
  } catch (error) {
    if (!(error instanceof FirebaseConfigError)) {
      throw error;
    }
  }

  return mockVehicles.find((vehicle) => vehicle.id === vehicleId) ?? null;
}

export async function listVehicles(filters?: VehicleFilters) {
  try {
    const allVehicles = await listDocuments<Vehicle>("vehicles", {
      filters: [
        ...(typeof filters?.available === "boolean"
          ? [{ field: "available", operator: "==", value: filters.available } as const]
          : []),
        ...(filters?.category ? [{ field: "category", operator: "==", value: filters.category } as const] : []),
        ...(filters?.location ? [{ field: "location", operator: "==", value: filters.location } as const] : []),
      ],
      orderBy: [{ field: "createdAt", direction: "desc" }],
    });

    if (typeof filters?.maxDailyRate === "number") {
      const maxDailyRate = filters.maxDailyRate;

      return allVehicles.filter((vehicle) => vehicle.dailyRate <= maxDailyRate);
    }

    return allVehicles;
  } catch (error) {
    if (!(error instanceof FirebaseConfigError)) {
      throw error;
    }

    return mockVehicles.filter((vehicle) => {
      if (typeof filters?.available === "boolean" && vehicle.available !== filters.available) {
        return false;
      }

      if (filters?.category && vehicle.category !== filters.category) {
        return false;
      }

      if (filters?.location && vehicle.location !== filters.location) {
        return false;
      }

      if (typeof filters?.maxDailyRate === "number" && vehicle.dailyRate > filters.maxDailyRate) {
        return false;
      }

      return true;
    });
  }
}
