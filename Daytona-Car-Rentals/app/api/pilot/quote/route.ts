import { NextResponse } from "next/server";
import { body, limit, responseError } from "@/lib/pilot/http";
import { quote, publicState } from "@/lib/pilot/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return NextResponse.json(await publicState(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return responseError(e);
  }
}
export async function POST(request: Request) {
  try {
    const input = await body(request);
    await limit("quotes", 500, 3600000);
    return NextResponse.json(await quote(input), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return responseError(e);
  }
}
