import type { Metadata } from "next";

import { SiteShell } from "@/components/layout/SiteShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daytona Car Rentals",
  description:
    "Locally owned car rentals in Daytona Beach, FL — book through Turo for easy, insured rentals. Economy, SUV, vans, and trucks available.",
  openGraph: {
    siteName: "Daytona Car Rentals",
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans">
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
