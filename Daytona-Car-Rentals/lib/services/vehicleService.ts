import "server-only";

import type { Vehicle, VehicleFilters } from "@/types";
import { FirebaseConfigError, getDocument, listDocuments, setDocument, updateDocument } from "@/lib/firebase/firestore";
import { mockVehicles } from "@/lib/data/mockVehicles";

type UpsertVehicleInput = Omit<Vehicle, "createdAt" | "updatedAt" | "id"> & {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

function createVehicleId(input: Pick<Vehicle, "make" | "model" | "year">) {
  const base = `${input.make}-${input.model}-${input.year}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${base || "vehicle"}-${Date.now().toString(36)}`;
}

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

export async function createVehicle(input: UpsertVehicleInput) {
  const now = new Date();
  const vehicleId = input.id || createVehicleId(input);
  const vehicle: Vehicle = {
    ...input,
    id: vehicleId,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };

  try {
    await setDocument(`vehicles/${vehicleId}`, vehicle);
    return vehicle;
  } catch (error) {
    if (!(error instanceof FirebaseConfigError)) {
      throw error;
    }

    mockVehicles.unshift(vehicle);
    return vehicle;
  }
}

export async function updateVehicle(vehicleId: string, input: Partial<Omit<Vehicle, "id" | "createdAt">>) {
  const existingVehicle = await getVehicleById(vehicleId);

  if (!existingVehicle) {
    throw new Error("Vehicle not found.");
  }

  const nextVehicle: Vehicle = {
    ...existingVehicle,
    ...input,
    id: vehicleId,
    updatedAt: new Date(),
  };

  try {
    await updateDocument<Vehicle>(`vehicles/${vehicleId}`, {
      ...input,
      updatedAt: nextVehicle.updatedAt,
    });
    return nextVehicle;
  } catch (error) {
    if (!(error instanceof FirebaseConfigError)) {
      throw error;
    }

    const index = mockVehicles.findIndex((vehicle) => vehicle.id === vehicleId);

    if (index >= 0) {
      mockVehicles[index] = nextVehicle;
    } else {
      mockVehicles.unshift(nextVehicle);
    }

    return nextVehicle;
  }
}
