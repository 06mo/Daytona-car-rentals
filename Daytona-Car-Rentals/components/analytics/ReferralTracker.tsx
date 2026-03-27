"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

export function ReferralTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const trackedCodesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const referralCode = searchParams.get("ref")?.trim().toLowerCase();

    if (!referralCode) {
      return;
    }

    window.sessionStorage.setItem("referral_code", referralCode);

    const trackedCodes = getTrackedCodes();

    if (trackedCodes.has(referralCode) || trackedCodesRef.current.has(referralCode)) {
      trackedCodesRef.current.add(referralCode);
      return;
    }

    trackedCodesRef.current.add(referralCode);
    trackedCodes.add(referralCode);
    window.sessionStorage.setItem("referral_click_codes", JSON.stringify(Array.from(trackedCodes)));

    void fetch("/api/analytics/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventName: "referral_click",
        path: `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`,
        sessionId: window.sessionStorage.getItem("analytics_session_id") ?? undefined,
        metadata: {
          referralCode,
        },
      }),
    }).catch(() => undefined);
  }, [pathname, searchParams]);

  return null;
}

function getTrackedCodes() {
  if (typeof window === "undefined") {
    return new Set<string>();
  }

  try {
    const raw = window.sessionStorage.getItem("referral_click_codes");

    if (!raw) {
      return new Set<string>();
    }

    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? new Set(parsed.filter((value): value is string => typeof value === "string")) : new Set<string>();
  } catch {
    return new Set<string>();
  }
}
