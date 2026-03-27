import { NextResponse } from "next/server";

import { reportMonitoringEvent } from "@/lib/monitoring/monitoring";
import { enforceRateLimit } from "@/lib/security/rateLimit";
import { logAnalyticsEvent } from "@/lib/services/analyticsService";
import type { AnalyticsEventName } from "@/types";

type AnalyticsBody = {
  eventName?: AnalyticsEventName;
  metadata?: Record<string, unknown>;
  path?: string;
  sessionId?: string;
};

const analyticsTrackPolicy = {
  id: "analytics-track",
  limit: 120,
  windowMs: 60 * 1000,
} as const;

export async function POST(request: Request) {
  try {
    const limitResponse = enforceRateLimit(request, analyticsTrackPolicy);

    if (limitResponse) {
      return limitResponse;
    }

    const body = (await request.json()) as AnalyticsBody;

    if (!body.eventName || !body.path) {
      return NextResponse.json({ error: "eventName and path are required." }, { status: 400 });
    }

    await logAnalyticsEvent({
      eventName: body.eventName,
      path: body.path,
      sessionId: body.sessionId,
      metadata: body.metadata,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    await reportMonitoringEvent({
      source: "api.analytics.track",
      message: "Analytics event capture failed.",
      severity: "warning",
      error,
      context: {
        method: request.method,
        path: "/api/analytics/track",
      },
      alert: false,
    });

    return NextResponse.json({ ok: false });
  }
}
