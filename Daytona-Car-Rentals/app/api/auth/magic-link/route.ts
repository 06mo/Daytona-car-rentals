import { NextResponse } from "next/server";
import { createElement } from "react";

import { MagicLinkEmail } from "@/emails/MagicLinkEmail";
import { getAdminAuth } from "@/lib/firebase/admin";
import { reportMonitoringEvent } from "@/lib/monitoring/monitoring";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/security/rateLimit";
import { sendEmail } from "@/lib/services/notificationService";

type MagicLinkRequestBody = {
  continueUrl?: string;
  email?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeContinueUrl(value?: string) {
  if (!value || !value.startsWith("/")) {
    return "/dashboard";
  }

  if (
    value.startsWith("/booking/") ||
    value === "/dashboard" ||
    value.startsWith("/dashboard/") ||
    value.startsWith("/auth/")
  ) {
    return value;
  }

  return "/dashboard";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as MagicLinkRequestBody;
    const email = body.email?.trim().toLowerCase();

    if (!email || !emailPattern.test(email)) {
      return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
    }

    const limitResponse = enforceRateLimit(request, rateLimitPolicies.magicLink, email);

    if (limitResponse) {
      return limitResponse;
    }

    const adminAuth = getAdminAuth();

    if (!adminAuth) {
      return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
    }

    const continueUrl = normalizeContinueUrl(body.continueUrl);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://daytonacarrentals.com";
    const magicLink = await adminAuth.generateSignInWithEmailLink(email, {
      handleCodeInApp: true,
      url: `${siteUrl}/auth/verify?continueUrl=${encodeURIComponent(continueUrl)}`,
    });

    await sendEmail({
      to: email,
      subject: "Your secure Daytona Car Rentals sign-in link",
      react: createElement(MagicLinkEmail, { magicLink }),
    });

    return NextResponse.json({ sent: true });
  } catch (error) {
    await reportMonitoringEvent({
      source: "api.auth.magic_link",
      message: "Magic link request failed.",
      severity: "error",
      error,
      context: {
        method: request.method,
        path: "/api/auth/magic-link",
      },
    });

    return NextResponse.json({ error: "Unable to send magic link right now." }, { status: 500 });
  }
}
