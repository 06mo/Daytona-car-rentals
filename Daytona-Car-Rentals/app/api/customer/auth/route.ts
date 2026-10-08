import { PilotError } from "@/lib/pilot/errors";
import { NextResponse } from "next/server";
import { body, responseError } from "@/lib/pilot/http";
import {
  sendLink,
  confirmLink,
  requireCustomer,
  logout,
} from "@/lib/customer/auth";
export const runtime = "nodejs";
export async function GET() {
  try {
    return NextResponse.json(
      { customer: await requireCustomer() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    if (e instanceof PilotError && e.status === 401)
      return NextResponse.json(
        { customer: null },
        { headers: { "Cache-Control": "no-store" } },
      );
    return responseError(e);
  }
}
export async function POST(r: Request) {
  try {
    const a = await body(r);
    return NextResponse.json(
      a.action === "confirm" ? await confirmLink(a) : await sendLink(a),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return responseError(e);
  }
}
export async function DELETE(r: Request) {
  try {
    await body(r);
    await logout();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return responseError(e);
  }
}
