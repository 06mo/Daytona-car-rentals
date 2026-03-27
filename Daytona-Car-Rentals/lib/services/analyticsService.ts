import "server-only";

import { addDocument, FirebaseConfigError, listDocuments } from "@/lib/firebase/firestore";
import type { AnalyticsEvent, AnalyticsEventName, CreateAnalyticsEventInput } from "@/types";

export async function logAnalyticsEvent(input: CreateAnalyticsEventInput): Promise<void> {
  try {
    const { metadata, ...rest } = input;
    await addDocument("analytics_events", {
      ...rest,
      ...(metadata !== undefined ? { metadata: Object.fromEntries(Object.entries(metadata).filter(([, v]) => v !== undefined)) } : {}),
      createdAt: new Date(),
    });
  } catch (error) {
    if (error instanceof FirebaseConfigError) {
      return;
    }

    console.error("[analytics] Failed to write analytics event:", input.eventName, error);
  }
}

export async function listAnalyticsEvents(limit = 500): Promise<AnalyticsEvent[]> {
  try {
    return await listDocuments<AnalyticsEvent>("analytics_events", {
      orderBy: [{ field: "createdAt", direction: "desc" }],
      limit,
    });
  } catch (error) {
    if (error instanceof FirebaseConfigError) {
      return [];
    }

    console.error("[analytics] Failed to load analytics events:", error);
    return [];
  }
}

export async function getAnalyticsDashboardSummary() {
  const events = await listAnalyticsEvents(1000);
  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);

  const recentEvents = events.filter((event) => event.createdAt >= last30Days);
  const count = (name: AnalyticsEventName) => recentEvents.filter((event) => event.eventName === name).length;
  const pageViews = count("page_view");
  const checkoutStarts = count("checkout_started");
  const bookingsCreated = count("booking_created");

  const topPages = Array.from(
    recentEvents
      .filter((event) => event.eventName === "page_view")
      .reduce((map, event) => {
        map.set(event.path, (map.get(event.path) ?? 0) + 1);
        return map;
      }, new Map<string, number>())
      .entries(),
  )
    .sort((first, second) => second[1] - first[1])
    .slice(0, 5)
    .map(([path, views]) => ({ path, views }));

  return {
    pageViews,
    checkoutStarts,
    bookingsCreated,
    bookingConversionRate: checkoutStarts > 0 ? Math.round((bookingsCreated / checkoutStarts) * 100) : 0,
    topPages,
  };
}
