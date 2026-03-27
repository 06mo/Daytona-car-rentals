"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const pathWithQuery = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    const sessionId = getSessionId();
    const payload = JSON.stringify({
      eventName: "page_view",
      path: pathWithQuery,
      sessionId,
    });

    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/analytics/track", blob);
      return;
    }

    void fetch("/api/analytics/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: payload,
      keepalive: true,
    }).catch(() => undefined);
  }, [pathname, searchParams]);

  return null;
}

function getSessionId() {
  if (typeof window === "undefined") {
    return "server";
  }

  const existing = window.sessionStorage.getItem("analytics_session_id");

  if (existing) {
    return existing;
  }

  const nextValue = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  window.sessionStorage.setItem("analytics_session_id", nextValue);
  return nextValue;
}
