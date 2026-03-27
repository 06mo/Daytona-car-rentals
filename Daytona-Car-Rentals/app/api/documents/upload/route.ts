import { NextResponse } from "next/server";

import { FirebaseConfigError } from "@/lib/firebase/firestore";
import { requireAuth } from "@/lib/middleware/withAuth";
import { reportMonitoringEvent } from "@/lib/monitoring/monitoring";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/security/rateLimit";
import { upsertUserDocument } from "@/lib/services/documentService";
import type { DocumentType } from "@/types";

type RequestBody = {
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  storageRef?: string;
  type?: DocumentType;
};

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const limitResponse = enforceRateLimit(request, rateLimitPolicies.documentUpload, user.userId);

    if (limitResponse) {
      return limitResponse;
    }

    const body = (await request.json()) as RequestBody;

    if (!body.type || !body.fileName || !body.fileSize || !body.mimeType || !body.storageRef) {
      return NextResponse.json({ error: "Missing document metadata." }, { status: 400 });
    }

    const document = await upsertUserDocument(user.userId, {
      type: body.type,
      storageRef: body.storageRef,
      fileName: body.fileName,
      fileSize: body.fileSize,
      mimeType: body.mimeType,
      status: "pending",
    });

    return NextResponse.json({ document });
  } catch (error) {
    await reportMonitoringEvent({
      source: "api.documents.upload",
      message: "Document metadata upload failed.",
      severity: error instanceof FirebaseConfigError ? "warning" : "error",
      error,
      context: {
        method: request.method,
        path: "/api/documents/upload",
      },
      alert: !(error instanceof FirebaseConfigError),
    });

    if (error instanceof FirebaseConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    if (error instanceof Error && error.message === "Authentication required.") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Unable to store document metadata." }, { status: 500 });
  }
}
