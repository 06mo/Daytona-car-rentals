import { NextResponse } from "next/server";
import { body, responseError, requireAdmin } from "@/lib/pilot/http";
import { dispatchNotifications } from "@/lib/customer/notifications";
export const runtime = "nodejs";
export async function POST(r: Request) {
  try {
    await body(r);
    await requireAdmin();
    return NextResponse.json(await dispatchNotifications());
  } catch (e) {
    return responseError(e);
  }
}
