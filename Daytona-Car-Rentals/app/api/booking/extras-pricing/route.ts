import { NextResponse } from "next/server";

import { getDocument, FirebaseConfigError } from "@/lib/firebase/firestore";
import type { ExtrasPricing } from "@/types";

const fallbackExtrasPricing: ExtrasPricing = {
  additionalDriver: 1500,
  gps: 1000,
  childSeat: 800,
  cdw: 2500,
  updatedAt: new Date(),
};

export async function GET() {
  try {
    const extrasPricing = await getDocument<ExtrasPricing>("extras_pricing/current");
    return NextResponse.json({ extrasPricing: extrasPricing ?? fallbackExtrasPricing });
  } catch (error) {
    if (error instanceof FirebaseConfigError) {
      return NextResponse.json({ extrasPricing: fallbackExtrasPricing });
    }

    return NextResponse.json({ error: "Unable to load extras pricing." }, { status: 500 });
  }
}
