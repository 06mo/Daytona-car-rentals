import { NextResponse } from "next/server";
import { body, responseError, limit } from "@/lib/pilot/http";
import { requireCustomer } from "@/lib/customer/auth";
import {
  trips,
  saveIntake,
  submitIntake,
  acceptAlternative,
  requestClaim,
} from "@/lib/customer/portal";
export const runtime = "nodejs";
export async function GET() {
  try {
    return NextResponse.json(
      { trips: await trips(await requireCustomer()) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return responseError(e);
  }
}
export async function POST(r: Request) {
  try {
    const a = await body(r),
      u = await requireCustomer();
    await limit("portal:" + u.id, 60, 3600000);
    if (a.action === "intake") await saveIntake(u, a.id, a.intake);
    else if (a.action === "submit") await submitIntake(u, a.id);
    else if (a.action === "alternative")
      await acceptAlternative(u, a.id, a.revision);
    else if (a.action === "claim")
      return NextResponse.json(await requestClaim(u, a.id));
    else throw Error("Unknown action");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return responseError(e);
  }
}
