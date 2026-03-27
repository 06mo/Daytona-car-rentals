import { NextResponse } from "next/server";

import { withAuth } from "@/lib/middleware/withAuth";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/security/rateLimit";
import { getVehicleById, updateVehicle } from "@/lib/services/vehicleService";
import type { MileagePolicy, TransmissionType, VehicleCategory } from "@/types";

type UpdateVehicleBody = {
  available?: boolean;
  category?: VehicleCategory;
  dailyRate?: number;
  depositAmount?: number;
  description?: string;
  features?: string[];
  images?: string[];
  location?: string;
  make?: string;
  mileagePolicy?: MileagePolicy;
  model?: string;
  seats?: number;
  transmission?: TransmissionType;
  year?: number;
};

type Context = {
  params: Promise<{ vehicleId: string }>;
};

export const PATCH = withAuth(async (request, context, user) => {
  const limitResponse = enforceRateLimit(request, rateLimitPolicies.adminMutation, user.userId);

  if (limitResponse) {
    return limitResponse;
  }

  if (user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { vehicleId } = await (context as Context).params;
  const existingVehicle = await getVehicleById(vehicleId);

  if (!existingVehicle) {
    return NextResponse.json({ error: "Vehicle not found." }, { status: 404 });
  }

  const body = (await request.json()) as UpdateVehicleBody;
  const vehicle = await updateVehicle(vehicleId, body);

  return NextResponse.json({ vehicle });
});
