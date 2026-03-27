import { NextResponse } from "next/server";

import { reportMonitoringEvent } from "@/lib/monitoring/monitoring";
import { handleStripeWebhookEvent } from "@/lib/stripe/webhooks";
import { constructWebhookEvent, StripeConfigError } from "@/lib/stripe/server";

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
    }

    const payload = await request.text();
    const event = await constructWebhookEvent(payload, signature);

    await handleStripeWebhookEvent(event);

    return NextResponse.json({ received: true });
  } catch (error) {
    await reportMonitoringEvent({
      source: "api.stripe.webhook",
      message: "Stripe webhook processing failed.",
      severity: error instanceof StripeConfigError ? "critical" : "error",
      error,
      context: {
        method: request.method,
        path: "/api/stripe/webhook",
      },
    });

    if (error instanceof StripeConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Unable to process webhook." }, { status: 400 });
  }
}
