import "server-only";

import { defaultVehicleOptions } from "@/lib/data/vehicleOptions";
import { FirebaseConfigError, getDocument, setDocument } from "@/lib/firebase/firestore";
import type { VehicleOptions } from "@/types";

const VEHICLE_OPTIONS_PATH = "app_settings/vehicle_options";

function normalizeValues(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));
}

function normalizeVehicleOptions(options?: Partial<VehicleOptions> | null): VehicleOptions {
  return {
    locations: normalizeValues(options?.locations ?? defaultVehicleOptions.locations),
    featurePresets: normalizeValues(options?.featurePresets ?? defaultVehicleOptions.featurePresets),
    updatedAt: options?.updatedAt instanceof Date ? options.updatedAt : new Date(),
  };
}

export async function getVehicleOptions() {
  try {
    const options = await getDocument<VehicleOptions>(VEHICLE_OPTIONS_PATH);
    return normalizeVehicleOptions(options);
  } catch (error) {
    if (!(error instanceof FirebaseConfigError)) {
      throw error;
    }

    return normalizeVehicleOptions(defaultVehicleOptions);
  }
}

export async function updateVehicleOptions(input: {
  featurePresets: string[];
  locations: string[];
}) {
  const nextOptions = normalizeVehicleOptions({
    featurePresets: input.featurePresets,
    locations: input.locations,
    updatedAt: new Date(),
  });

  try {
    await setDocument(VEHICLE_OPTIONS_PATH, nextOptions, { merge: true });
    return nextOptions;
  } catch (error) {
    if (!(error instanceof FirebaseConfigError)) {
      throw error;
    }

    return nextOptions;
  }
}
