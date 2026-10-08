import { requireCustomer } from "@/lib/customer/auth";
import { NextResponse } from "next/server";
import { body, limit, responseError } from "@/lib/pilot/http";
import { createRequest } from "@/lib/pilot/store";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const input = await body(request);
    await limit("requests", 100, 3600000);
    const identity = await requireCustomer();
    const r = await createRequest(input, identity);
    return NextResponse.json(
      { id: r.id, status: r.status, demo: r.demo, holdUntil: r.holdUntil },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return responseError(e);
  }
}
