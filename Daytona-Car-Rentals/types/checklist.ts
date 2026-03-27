export type ChecklistType = "pickup" | "dropoff";

export type FuelLevel = "empty" | "quarter" | "half" | "three_quarter" | "full";

export type ChecklistStatus = "draft" | "submitted";

export type VehicleChecklist = {
  id: ChecklistType;
  bookingId: string;
  vehicleId: string;
  type: ChecklistType;
  fuelLevel: FuelLevel;
  odometerMiles: number;
  conditionNotes: string;
  damageNoted: boolean;
  damageDescription?: string;
  photoRefs: string[];
  adminSignature?: string;
  customerSignature?: string;
  completedBy: string;
  completedAt: Date;
  status: ChecklistStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type UpsertVehicleChecklistInput = Omit<
  VehicleChecklist,
  "bookingId" | "completedAt" | "completedBy" | "createdAt" | "id" | "type" | "updatedAt" | "vehicleId"
>;
