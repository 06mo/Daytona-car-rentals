import { NextResponse } from "next/server";
import { body, responseError, signIn, signOut } from "@/lib/pilot/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const input = await body(request);
    await signIn(input.password);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return responseError(e);
  }
}
export async function DELETE(request: Request) {
  try {
    await body(request);
    await signOut();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return responseError(e);
  }
}
