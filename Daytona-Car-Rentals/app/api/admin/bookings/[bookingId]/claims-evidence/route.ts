import { NextResponse } from "next/server";

import { FirebaseConfigError } from "@/lib/firebase/firestore";
import { withAuth } from "@/lib/middleware/withAuth";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/security/rateLimit";
import { getBookingById } from "@/lib/services/bookingService";
import { generateClaimsEvidencePackage } from "@/lib/services/claimsEvidenceService";

type RouteContext = {
  params: Promise<{ bookingId: string }>;
};

export const GET = withAuth(async (request, context: RouteContext, user) => {
  const limitResponse = enforceRateLimit(request, rateLimitPolicies.adminMutation, user.userId);

  if (limitResponse) {
    return limitResponse;
  }

  if (user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { bookingId } = await context.params;

  const booking = await getBookingById(bookingId);

  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  try {
    const pkg = await generateClaimsEvidencePackage(bookingId, user.userId);

    // Serialise Date objects that may remain on the top-level package fields
    const serialised = JSON.parse(
      JSON.stringify(pkg, (_key, value: unknown) => {
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      }),
    ) as Record<string, unknown>;

    return NextResponse.json(serialised);
  } catch (error) {
    if (error instanceof FirebaseConfigError) {
      return NextResponse.json(
        { error: "Evidence package unavailable: Firebase is not configured in this environment." },
        { status: 503 },
      );
    }

    const message = error instanceof Error ? error.message : "Failed to generate claims evidence package.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
