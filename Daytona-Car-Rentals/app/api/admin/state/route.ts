import { NextResponse } from "next/server";
import { body, requireAdmin, responseError } from "@/lib/pilot/http";
import { adminAction, adminState } from "@/lib/pilot/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json(await adminState(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return responseError(e);
  }
}
export async function POST(request: Request) {
  try {
    const input = await body(request);
    const actor = await requireAdmin();
    await adminAction(input, actor);
    return NextResponse.json(await adminState(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return responseError(e);
  }
}
