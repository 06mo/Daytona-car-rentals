import { PilotError } from "@/lib/pilot/errors";
import { NextResponse } from "next/server";
import { requireCustomer } from "@/lib/customer/auth";
import { body, limit, responseError, sameOrigin } from "@/lib/pilot/http";
import {
  loadDraft,
  listDrafts,
  saveDraft,
  uploadDraftDocument,
  removeDraftDocument,
  reuseDocument,
  returningDetails,
  draftDocument,
} from "@/lib/customer/drafts";
export const runtime = "nodejs";
export async function GET(r: Request) {
  try {
    const user = await requireCustomer(),
      p = new URL(r.url).searchParams;
    if (p.has("document"))
      return new Response(
        new Uint8Array(await draftDocument(user, p.get("document")!)),
        {
          headers: {
            "Content-Type": "image/jpeg",
            "Content-Disposition": 'attachment; filename="rental-document.jpg"',
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": "default-src 'none'",
          },
        },
      );
    return NextResponse.json(
      p.has("id")
        ? await loadDraft(user, p.get("id")!)
        : {
            drafts: await listDrafts(user),
            saved: await returningDetails(user),
          },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return responseError(e);
  }
}
export async function POST(r: Request) {
  try {
    sameOrigin(r);
    const user = await requireCustomer(),
      a = await body(r, 2850000);
    if (a.expectedOwner !== user.id)
      throw new PilotError(
        "Your signed-in account changed. Reload your own draft.",
        409,
      );
    await limit("draft:" + user.id, 100, 3600000);
    let result;
    if (a.action === "save") result = await saveDraft(user, a);
    else if (a.action === "upload") {
      await limit("upload:" + user.id, 20, 3600000);
      result = await uploadDraftDocument(user, a);
    } else if (a.action === "remove")
      result = await removeDraftDocument(user, a.id, a.kind);
    else if (a.action === "reuse") result = await reuseDocument(user, a);
    else throw Error("Unknown action");
    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return responseError(e);
  }
}
