import { NextResponse } from "next/server";

import { withAuth } from "@/lib/middleware/withAuth";
import { getChecklist } from "@/lib/services/checklistService";
import type { ChecklistType } from "@/types";

type RequestContext = {
  params: Promise<{ bookingId: string; type: string }>;
};

export const GET = withAuth<RequestContext>(async (_request, context, user) => {
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { bookingId, type } = await context.params;
  const checklist = await getChecklist(bookingId, type as ChecklistType);

  if (!checklist) {
    return NextResponse.json({ checklist: null }, { status: 200 });
  }

  return NextResponse.json({ checklist });
});
