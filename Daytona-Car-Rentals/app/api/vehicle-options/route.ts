import { NextResponse } from "next/server";

import { getVehicleOptions } from "@/lib/services/vehicleOptionsService";

export async function GET() {
  const options = await getVehicleOptions();
  return NextResponse.json({ options });
}
