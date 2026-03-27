import { NextResponse } from "next/server";

import { FirebaseConfigError } from "@/lib/firebase/firestore";
import { withAuth } from "@/lib/middleware/withAuth";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/security/rateLimit";
import { reviewUserDocument } from "@/lib/services/documentService";

type RequestBody = {
  action?: "approve" | "reject";
  docType?: "drivers_license" | "insurance_card";
  rejectionReason?: string;
  userId?: string;
};

export const POST = withAuth(async (request, _context, user) => {
  try {
    const limitResponse = enforceRateLimit(request, rateLimitPolicies.adminMutation, user.userId);

    if (limitResponse) {
      return limitResponse;
    }

    if (user.role !== "admin") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const body = (await request.json()) as RequestBody;

    if (!body.userId || !body.docType || !body.action) {
      return NextResponse.json({ error: "userId, docType, and action are required." }, { status: 400 });
    }

    if (body.userId === user.userId) {
      return NextResponse.json({ error: "Admins cannot review their own documents." }, { status: 403 });
    }

    if (body.action === "reject" && !body.rejectionReason?.trim()) {
      return NextResponse.json({ error: "Rejection reason is required." }, { status: 400 });
    }

    const document = await reviewUserDocument(body.userId, body.docType, {
      status: body.action === "approve" ? "approved" : "rejected",
      reviewedBy: user.userId,
      rejectionReason: body.action === "reject" ? body.rejectionReason?.trim() : undefined,
    });

    return NextResponse.json({ document });
  } catch (error) {
    if (error instanceof FirebaseConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Unable to review document." }, { status: 500 });
  }
});
