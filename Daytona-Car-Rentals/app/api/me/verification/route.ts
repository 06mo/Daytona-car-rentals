import { NextResponse } from "next/server";

import { FirebaseConfigError } from "@/lib/firebase/firestore";
import { requireAuth } from "@/lib/middleware/withAuth";
import { getUserVerificationSummary } from "@/lib/services/documentService";
import { getUserProfile } from "@/lib/services/userService";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const [profile, verification] = await Promise.all([
      getUserProfile(user.userId),
      getUserVerificationSummary(user.userId),
    ]);

    return NextResponse.json({
      profile,
      verification,
    });
  } catch (error) {
    if (error instanceof FirebaseConfigError) {
      return NextResponse.json({ profile: null, verification: null });
    }

    if (error instanceof Error && error.message === "Authentication required.") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json({ error: "Unable to load verification status." }, { status: 500 });
  }
}
