import { NextResponse } from "next/server";
import { body, responseError, limit, requireAdmin } from "@/lib/pilot/http";
import { requireCustomer } from "@/lib/customer/auth";
import {
  document,
  uploadDocument,
  deleteDocument,
} from "@/lib/customer/portal";
export const runtime = "nodejs";
export async function GET(r: Request) {
  try {
    const p = new URL(r.url).searchParams;
    const actor = p.get("owner") === "true" ? await requireAdmin() : null;
    const bytes = await document(
      p.get("id") || "",
      actor ? null : await requireCustomer(),
      actor || undefined,
    );
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": 'attachment; filename="rental-document.jpg"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'",
      },
    });
  } catch (e) {
    return responseError(e);
  }
}
export async function POST(r: Request) {
  try {
    const a = await body(r, 2850000),
      u = await requireCustomer();
    await limit("upload:" + u.id, 20, 3600000);
    return NextResponse.json(
      await uploadDocument(u, a.id, a.kind, a.content, a.validUntil),
    );
  } catch (e) {
    return responseError(e);
  }
}
export async function DELETE(r: Request) {
  try {
    const a = await body(r);
    await deleteDocument(await requireCustomer(), a.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return responseError(e);
  }
}
