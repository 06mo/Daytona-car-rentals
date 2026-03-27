import type { VehicleOptions } from "@/types";

export const defaultVehicleLocations = [
  "Daytona Beach Airport",
  "Downtown Daytona Beach",
  "Daytona International Speedway",
  "Ormond Beach",
  "New Smyrna Beach",
];

export const defaultVehicleFeaturePresets = [
  "Bluetooth",
  "Backup Camera",
  "Apple CarPlay",
  "Android Auto",
  "USB Ports",
  "GPS Ready",
  "Cruise Control",
  "Blind Spot Monitoring",
  "Heated Seats",
  "Third Row Seating",
];

export const defaultVehicleOptions: VehicleOptions = {
  locations: defaultVehicleLocations,
  featurePresets: defaultVehicleFeaturePresets,
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};
