import type { Metadata } from "next";
import { AlertTriangle, Flag, Map } from "lucide-react";

import { LandingPage } from "@/components/landing/LandingPage";
import type { FAQItem } from "@/components/landing/LandingFAQ";
import { buildFaqSchema, createLandingMetadata, localBusinessSchema } from "@/lib/data/localBusinessSchema";
import { listVehicles } from "@/lib/services/vehicleService";

export const metadata: Metadata = createLandingMetadata(
  "daytona-500",
  "Car Rental for Daytona 500 & Speed Weeks | Book Early",
  "Rent a car for the Daytona 500 and Speed Weeks. Fleet availability is limited during race week — secure your vehicle before it sells out.",
);

const faqItems: FAQItem[] = [
  {
    question: "How far in advance should I book for the Daytona 500?",
    answer: "We recommend booking 4–6 weeks before race week. February is our busiest month and vehicles are often fully reserved by late January.",
  },
  {
    question: "Is there surge pricing during the Daytona 500?",
    answer: "Yes. Race week falls within our Speed Weeks peak pricing period. The exact rate is shown transparently at checkout before you confirm.",
  },
  {
    question: "Where can I park at the Daytona International Speedway?",
    answer: "Parking passes are sold separately by the Speedway. Our vehicles comply with all standard size requirements for Speedway lots.",
  },
  {
    question: "What if my race is cancelled or postponed?",
    answer: "Bookings can be cancelled up to 24 hours before the rental start. See our cancellation policy for details.",
  },
  {
    question: "Do you offer one-way rentals from the airport?",
    answer: "Contact us for one-way arrangements. Most bookings return to the same location.",
  },
];

export default async function Daytona500LandingPage() {
  const vehicles = await listVehicles({ available: true });
  const eventSchema = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: "Daytona 500",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: "Daytona International Speedway",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Daytona Beach",
        addressRegion: "FL",
        addressCountry: "US",
      },
    },
  };

  return (
    <LandingPage
      badge="February · Daytona International Speedway"
      ctaBody="Race week inventory moves quickly. Reserve now to lock in transportation before hotel and event traffic peaks."
      ctaHeading="Engines Are Already Running. Book Your Car Before It's Gone."
      faqItems={faqItems}
      features={[
        {
          icon: Flag,
          title: "Limited Race-Week Availability",
          body: "Our fleet is in high demand during the Daytona 500. We recommend booking 4–6 weeks in advance.",
        },
        {
          icon: Map,
          title: "Explore Beyond the Track",
          body: "Hotels, restaurants, and beaches are spread across the area. A rental car is the best way to move freely during Speed Weeks.",
        },
        {
          icon: AlertTriangle,
          title: "Flexible Pickup & Drop-Off",
          body: "Multiple convenient locations so you can get from your hotel to the speedway on your schedule.",
        },
      ]}
      headline="Car Rental for Daytona 500 & Speed Weeks"
      notice={
        <div className="rounded-[2rem] border border-orange-300 bg-orange-50 px-6 py-5 text-sm leading-7 text-slate-700 shadow-sm">
          <strong className="text-slate-900">Race Week Notice:</strong> Vehicle demand peaks sharply during Daytona 500 week.
          Peak-season pricing applies and is shown at checkout. Book early to lock in availability.
        </div>
      }
      schemas={[localBusinessSchema, buildFaqSchema(faqItems), eventSchema]}
      subheadline="Speed Weeks brings hundreds of thousands of visitors to Daytona Beach every February. Our fleet fills up fast, so book your rental car as early as possible to guarantee availability during race week."
      vehicleBody="Available Daytona rentals for race week, hotel transfers, and wider Florida plans."
      vehicleHeading="Race Week Rentals"
      vehicles={vehicles}
    />
  );
}
