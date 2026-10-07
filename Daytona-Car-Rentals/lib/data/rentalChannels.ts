import { vehicles } from "./vehicles";

// Eligibility is a channel rule, not permission to bypass owner launch/rate/calendar gates.
export const directVehicleIds = [
  "corolla-3275798", "santafe-3143340", "ecosport-3580557",
  "elantra-3321200", "focus-3139374",
] as const;
export const isDirectRental = (id: string) => directVehicleIds.some((direct) => direct === id);
export const directVehicles = directVehicleIds.map((id) => vehicles.find((v) => v.id === id)!);
export const rentalFleet = [...directVehicles, ...vehicles.filter((v) => !isDirectRental(v.id))];
