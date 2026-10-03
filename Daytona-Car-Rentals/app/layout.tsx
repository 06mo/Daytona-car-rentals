import type { Metadata } from "next";

import { SiteShell } from "@/components/layout/SiteShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daytona Car Rentals",
  description:
    "Local cars in Daytona Beach. Clear quotes, reviewed direct-rental requests, and Turo booking options.",
  icons: { icon: "/brand/mark.svg" },
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
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
