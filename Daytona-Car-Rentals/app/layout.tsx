import type { Metadata } from "next";
import { Suspense } from "react";

import { AnalyticsTracker } from "@/components/analytics/AnalyticsTracker";
import { ReferralTracker } from "@/components/analytics/ReferralTracker";
import "./globals.css";
import { SiteShell } from "@/components/layout/SiteShell";

export const metadata: Metadata = {
  title: "Daytona Car Rentals",
  description: "Modern car rentals with a fast, reliable booking experience.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans">
        <Suspense fallback={null}>
          <AnalyticsTracker />
          <ReferralTracker />
        </Suspense>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
