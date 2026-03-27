import { NextResponse } from "next/server";

import { getProtectionPricing } from "@/lib/services/protectionService";

export async function GET() {
  const protectionPricing = await getProtectionPricing();
  return NextResponse.json({ protectionPricing });
}
