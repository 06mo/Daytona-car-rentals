export type AnalyticsEventName =
  | "page_view"
  | "referral_click"
  | "booking_dates_completed"
  | "booking_extras_completed"
  | "booking_review_completed"
  | "checkout_started"
  | "booking_created";

export type AnalyticsEvent = {
  id: string;
  createdAt: Date;
  eventName: AnalyticsEventName;
  path: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
};

export type CreateAnalyticsEventInput = Omit<AnalyticsEvent, "id" | "createdAt">;
