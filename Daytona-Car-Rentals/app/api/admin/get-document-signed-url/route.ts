import { NextResponse } from "next/server";

import { FirebaseConfigError } from "@/lib/firebase/firestore";
import { withAuth } from "@/lib/middleware/withAuth";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/security/rateLimit";
import { getSignedStorageUrl } from "@/lib/firebase/admin-storage";
import { FirebaseStorageConfigError } from "@/lib/firebase/client-storage";
import { getUserDocument } from "@/lib/services/documentService";

type RequestBody = {
  docType?: "drivers_license" | "insurance_card";
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

    if (!body.userId || !body.docType) {
      return NextResponse.json({ error: "userId and docType are required." }, { status: 400 });
    }

    const document = await getUserDocument(body.userId, body.docType);

    if (!document) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    const url = await getSignedStorageUrl(document.storageRef);
    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof FirebaseConfigError || error instanceof FirebaseStorageConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Unable to create signed URL." }, { status: 500 });
  }
});
