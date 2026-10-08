import { NextResponse } from "next/server";
import { body, responseError, requireAdmin } from "@/lib/pilot/http";
import {
  portalReview,
  ownerPortal,
  agreementFields,
} from "@/lib/customer/portal";
export const runtime = "nodejs";
export async function GET(r: Request) {
  try {
    const actor = await requireAdmin(),
      id = new URL(r.url).searchParams.get("agreement");
    return NextResponse.json(
      id ? await agreementFields(id, actor) : await ownerPortal(),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return responseError(e);
  }
}
export async function POST(r: Request) {
  try {
    const a = await body(r);
    await portalReview(a, await requireAdmin());
    return NextResponse.json({ ok: true });
  } catch (e) {
    return responseError(e);
  }
}
