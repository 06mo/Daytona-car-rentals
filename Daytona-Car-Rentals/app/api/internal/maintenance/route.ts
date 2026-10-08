import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { dispatchNotifications } from "@/lib/customer/notifications";
import { portalReview } from "@/lib/customer/portal";
import { PilotError } from "@/lib/pilot/errors";
import { responseError } from "@/lib/pilot/http";
export const runtime = "nodejs";
/** Server scheduler only. Customer mutations still require exact Origin + customer auth. */
export async function POST(request: Request) {
  try {
    const expected = process.env.DCR_MAINTENANCE_TOKEN;
    if (!expected || expected.length < 32)
      throw new PilotError(
        "Maintenance authentication is not configured.",
        503,
      );
    const header = request.headers.get("authorization") || "";
    const candidate = header.startsWith("Bearer ") ? header.slice(7) : "";
    const a = Buffer.from(candidate),
      b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b))
      throw new PilotError("Unauthorized.", 401);
    if (!process.env.DCR_SITE_ORIGIN)
      throw new PilotError(
        "Configure the site origin before running maintenance.",
        503,
      );
    await portalReview({ action: "purge" }, "service:maintenance");
    return NextResponse.json(await dispatchNotifications(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return responseError(error);
  }
}
