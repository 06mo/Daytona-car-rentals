import { NextResponse } from "next/server";

import { withAuth } from "@/lib/middleware/withAuth";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/security/rateLimit";
import { getVehicleOptions, updateVehicleOptions } from "@/lib/services/vehicleOptionsService";

type VehicleOptionsBody = {
  featurePresets?: string[];
  locations?: string[];
};

export const GET = withAuth(async (request, _context, user) => {
  const limitResponse = enforceRateLimit(request, rateLimitPolicies.adminMutation, user.userId);

  if (limitResponse) {
    return limitResponse;
  }

  if (user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const options = await getVehicleOptions();
  return NextResponse.json({ options });
});

export const PATCH = withAuth(async (request, _context, user) => {
  const limitResponse = enforceRateLimit(request, rateLimitPolicies.adminMutation, user.userId);

  if (limitResponse) {
    return limitResponse;
  }

  if (user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const body = (await request.json()) as VehicleOptionsBody;

  const options = await updateVehicleOptions({
    featurePresets: body.featurePresets ?? [],
    locations: body.locations ?? [],
  });

  return NextResponse.json({ options });
});
