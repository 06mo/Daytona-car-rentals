import { NextResponse } from "next/server";

import { FirebaseConfigError } from "@/lib/firebase/firestore";
import { requireAuth } from "@/lib/middleware/withAuth";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/security/rateLimit";
import { getUserProfile, upsertUserProfile } from "@/lib/services/userService";
import type { UserAddress } from "@/types";

type UpdateProfileBody = {
  address?: UserAddress;
  dateOfBirth?: string;
  displayName?: string;
  phone?: string;
  smsOptIn?: boolean;
};

const phonePattern = /^\+?[\d\s\-().]{7,20}$/;

export async function PATCH(request: Request) {
  try {
    const user = await requireAuth(request);
    const limitResponse = enforceRateLimit(request, rateLimitPolicies.profileUpdate, user.userId);

    if (limitResponse) {
      return limitResponse;
    }

    const body = (await request.json()) as UpdateProfileBody;

    if (body.displayName !== undefined && (body.displayName.trim().length < 2 || body.displayName.trim().length > 80)) {
      return NextResponse.json({ error: "Display name must be between 2 and 80 characters." }, { status: 400 });
    }

    if (body.phone !== undefined && !phonePattern.test(body.phone.trim())) {
      return NextResponse.json({ error: "Phone number format is invalid." }, { status: 400 });
    }

    if (body.dateOfBirth !== undefined && Number.isNaN(new Date(body.dateOfBirth).getTime())) {
      return NextResponse.json({ error: "Date of birth must be a valid date." }, { status: 400 });
    }

    if (body.smsOptIn !== undefined && typeof body.smsOptIn !== "boolean") {
      return NextResponse.json({ error: "smsOptIn must be a boolean." }, { status: 400 });
    }

    const existing = await getUserProfile(user.userId);

    if (!existing) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }

    const updated = await upsertUserProfile({
      ...existing,
      ...(body.displayName !== undefined ? { displayName: body.displayName.trim() } : {}),
      ...(body.phone !== undefined ? { phone: body.phone.trim() } : {}),
      ...(body.dateOfBirth !== undefined ? { dateOfBirth: body.dateOfBirth } : {}),
      ...(body.address !== undefined ? { address: body.address } : {}),
      ...(body.smsOptIn !== undefined ? { smsOptIn: body.smsOptIn } : {}),
    });

    return NextResponse.json({ profile: updated });
  } catch (error) {
    if (error instanceof FirebaseConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    if (error instanceof Error && error.message === "Authentication required.") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json({ error: "Unable to update profile." }, { status: 500 });
  }
}
