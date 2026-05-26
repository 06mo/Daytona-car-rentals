import type { Metadata } from "next";

import { SiteShell } from "@/components/layout/SiteShell";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://daytonacarrentals.com"),
  title: {
    default: "Daytona Car Rentals — Local Fleet on Turo",
    template: "%s | Daytona Car Rentals",
  },
  description:
    "Locally owned car rentals in Daytona Beach, FL. Economy sedans, SUVs, trucks & 8-passenger vans — book instantly through Turo with full insurance. Call (386) 898-4035.",
  keywords: ["car rental Daytona Beach", "Turo Daytona Beach", "SUV rental Daytona Beach", "van rental Daytona Beach", "truck rental Daytona Beach"],
  openGraph: {
    siteName: "Daytona Car Rentals",
    locale: "en_US",
    type: "website",
    images: [{ url: "/images/corolla-blue-2024.jpeg", width: 1200, height: 800, alt: "Daytona Car Rentals Fleet" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/images/corolla-blue-2024.jpeg"],
  },
  robots: {
    index: true,
    follow: true,
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
