import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/middleware/withAuth";
import { reportMonitoringEvent } from "@/lib/monitoring/monitoring";
import { isProtectionPackageId } from "@/lib/protection/config";
import { evaluateBookingRisk } from "@/lib/services/riskEngine";
import { getVehicleById } from "@/lib/services/vehicleService";
import type { ProtectionPackageId } from "@/types";

type RiskProfileRequest = {
  vehicleId?: string;
  startDate?: string;
  endDate?: string;
  protectionPackage?: ProtectionPackageId;
  promoCode?: string;
};

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = (await request.json()) as RiskProfileRequest;

    if (!body.vehicleId || !body.startDate || !body.endDate || !body.protectionPackage) {
      return NextResponse.json({ error: "vehicleId, startDate, endDate, and protectionPackage are required." }, { status: 400 });
    }

    if (!isProtectionPackageId(body.protectionPackage)) {
      return NextResponse.json({ error: "Protection package is invalid." }, { status: 422 });
    }

    const vehicle = await getVehicleById(body.vehicleId);

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found." }, { status: 404 });
    }

    const riskProfile = await evaluateBookingRisk({
      userId: user.userId,
      vehicle,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      protectionPackage: body.protectionPackage,
      pricingPromoCode: body.promoCode,
    });

    return NextResponse.json({ riskProfile });
  } catch (error) {
    await reportMonitoringEvent({
      source: "api.booking.risk_profile",
      message: "Risk profile lookup failed.",
      severity: "warning",
      error,
      context: {
        method: request.method,
        path: "/api/booking/risk-profile",
      },
      alert: false,
    });

    if (error instanceof Error && error.message === "Authentication required.") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Unable to compute risk profile." }, { status: 500 });
  }
}
