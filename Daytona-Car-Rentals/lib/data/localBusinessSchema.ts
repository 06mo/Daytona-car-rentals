import type { Metadata } from "next";

import type { FAQItem } from "@/components/landing/LandingFAQ";

export const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://daytonacarrentals.com";

export const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "AutoRental",
  name: "Daytona Car Rentals",
  url: BASE_URL,
  telephone: "(386) 898-4035",
  email: "msooijir@gmail.com",
  priceRange: "$$",
  image: `${BASE_URL}/images/corolla-blue-2024.jpeg`,
  sameAs: ["https://turo.com/host/15068965"],
  address: {
    "@type": "PostalAddress",
    streetAddress: "2500 W International Speedway Blvd",
    addressLocality: "Daytona Beach",
    addressRegion: "FL",
    postalCode: "32114",
    addressCountry: "US",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 29.1853,
    longitude: -81.0566,
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "08:00",
      closes: "18:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "Saturday",
      opens: "09:00",
      closes: "16:00",
    },
  ],
} as const;

export function buildFaqSchema(items: FAQItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function createLandingMetadata(slug: string, title: string, description: string): Metadata {
  const url = `${BASE_URL}/rentals/${slug}`;
  const ogImage = `${BASE_URL}/images/corolla-blue-2024.jpeg`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: "Daytona Car Rentals",
      locale: "en_US",
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 800, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}
