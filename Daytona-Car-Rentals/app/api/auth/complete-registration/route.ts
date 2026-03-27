import { NextResponse } from "next/server";

import { getAdminAuth } from "@/lib/firebase/admin";
import { requireAuth } from "@/lib/middleware/withAuth";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/security/rateLimit";
import { getUserProfile, upsertUserProfile } from "@/lib/services/userService";

type RequestBody = {
  displayName?: string;
};

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const limitResponse = enforceRateLimit(request, rateLimitPolicies.completeRegistration, user.userId);

    if (limitResponse) {
      return limitResponse;
    }

    const body = (await request.json().catch(() => ({}))) as RequestBody;
    const existing = await getUserProfile(user.userId);
    const now = new Date();

    const profile = await upsertUserProfile({
      id: user.userId,
      email: user.email ?? existing?.email ?? "",
      displayName:
        body.displayName?.trim() ||
        existing?.displayName ||
        user.email?.split("@")[0] ||
        "Daytona Customer",
      phone: existing?.phone ?? "",
      smsOptIn: existing?.smsOptIn,
      dateOfBirth: existing?.dateOfBirth ?? "",
      address: existing?.address,
      verificationStatus: existing?.verificationStatus ?? "unverified",
      role: existing?.role ?? "customer",
      stripeCustomerId: existing?.stripeCustomerId,
      completedBookingsCount: existing?.completedBookingsCount,
      repeatCustomer: existing?.repeatCustomer,
      repeatCustomerSince: existing?.repeatCustomerSince,
      fastTrackEligible: existing?.fastTrackEligible,
      loyaltyDiscountEligible: existing?.loyaltyDiscountEligible,
      lastLoginAt: now,
      ...(existing?.createdAt ? { createdAt: existing.createdAt } : {}),
      updatedAt: now,
    });

    if (!existing && user.role !== "admin") {
      const adminAuth = getAdminAuth();

      if (adminAuth) {
        await adminAuth.setCustomUserClaims(user.userId, { role: "customer" });
      }
    }

    return NextResponse.json({ user: profile });
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication required.") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json({ error: "Unable to complete registration." }, { status: 500 });
  }
}
