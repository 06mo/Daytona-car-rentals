import { NextResponse } from "next/server";

import { withAuth } from "@/lib/middleware/withAuth";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/security/rateLimit";
import { createVehicle } from "@/lib/services/vehicleService";
import type { MileagePolicy, TransmissionType, VehicleCategory } from "@/types";

type CreateVehicleBody = {
  available?: boolean;
  category?: VehicleCategory;
  dailyRate?: number;
  depositAmount?: number;
  description?: string;
  features?: string[];
  id?: string;
  images?: string[];
  location?: string;
  make?: string;
  mileagePolicy?: MileagePolicy;
  model?: string;
  seats?: number;
  transmission?: TransmissionType;
  year?: number;
};

export const POST = withAuth(async (request, _context, user) => {
  const limitResponse = enforceRateLimit(request, rateLimitPolicies.adminMutation, user.userId);

  if (limitResponse) {
    return limitResponse;
  }

  if (user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const body = (await request.json()) as CreateVehicleBody;

  if (
    !body.make ||
    !body.model ||
    !body.year ||
    !body.category ||
    typeof body.dailyRate !== "number" ||
    typeof body.depositAmount !== "number" ||
    typeof body.seats !== "number" ||
    !body.transmission ||
    body.mileagePolicy === undefined ||
    !body.location ||
    !body.description
  ) {
    return NextResponse.json({ error: "Missing required vehicle fields." }, { status: 400 });
  }

  const vehicle = await createVehicle({
    ...(body.id ? { id: body.id } : {}),
    make: body.make,
    model: body.model,
    year: body.year,
    category: body.category,
    dailyRate: body.dailyRate,
    depositAmount: body.depositAmount,
    images: body.images ?? [],
    features: body.features ?? [],
    seats: body.seats,
    transmission: body.transmission,
    mileagePolicy: body.mileagePolicy,
    available: body.available ?? true,
    location: body.location,
    description: body.description,
  });

  return NextResponse.json({ vehicle }, { status: 201 });
});
