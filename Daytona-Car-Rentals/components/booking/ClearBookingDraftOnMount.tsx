"use client";

import { useEffect } from "react";
import { getBookingDraftStorageKey, getBookingResumeStorageKey } from "@/lib/utils/bookingDraft";

export function ClearBookingDraftOnMount({ vehicleId }: { vehicleId: string }) {
  useEffect(() => {
    window.localStorage.removeItem(getBookingDraftStorageKey(vehicleId));
    window.sessionStorage.removeItem(getBookingResumeStorageKey(vehicleId));
  }, [vehicleId]);

  return null;
}
