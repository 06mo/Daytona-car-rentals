import type { Metadata } from "next";
import { Bus, CalendarRange, Users } from "lucide-react";

import { LandingPage } from "@/components/landing/LandingPage";
import type { FAQItem } from "@/components/landing/LandingFAQ";
import { buildFaqSchema, createLandingMetadata, localBusinessSchema } from "@/lib/data/localBusinessSchema";
import { listVehicles } from "@/lib/services/vehicleService";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createLandingMetadata(
  "van",
  "Van Rentals in Daytona Beach | Groups & Families",
  "Rent a van or people-carrier in Daytona Beach. Ideal for large groups, family reunions, sporting events, and airport transfers.",
);

const faqItems: FAQItem[] = [
  {
    question: "How many people fit in your vans?",
    answer: "Our vans seat 7 to 12 passengers. Exact seating capacity is listed on each vehicle.",
  },
  {
    question: "Can a van be used for airport group transfers?",
    answer: "Absolutely. Our vans are a cost-effective solution for group airport pick-ups and drop-offs.",
  },
  {
    question: "Is a special license required to drive a van?",
    answer: "No special license is required. A standard US driver's license covers all vehicles in our fleet.",
  },
  {
    question: "Do you offer multi-day van rentals?",
    answer: "Yes, and long-term rentals of 7+ days qualify for our weekly discount automatically.",
  },
];

export default async function VanLandingPage() {
  const vehicles = await listVehicles({ available: true, category: "van" });

  return (
    <LandingPage
      badge="Large Groups · 7–12 Passengers"
      ctaBody="Keep your group together with a Daytona van rental built for airport pickups, events, and shared travel plans."
      ctaHeading="The Whole Group Travels Together."
      faqItems={faqItems}
      features={[
        {
          icon: Users,
          title: "Maximum Capacity",
          body: "Seats up to 12 passengers with luggage space for extended trips.",
        },
        {
          icon: CalendarRange,
          title: "Event-Ready",
          body: "Popular for Daytona 500, Bike Week, and Spring Break group travel.",
        },
        {
          icon: Bus,
          title: "One Vehicle, Whole Group",
          body: "Simpler logistics, shared costs, and less parking stress.",
        },
      ]}
      headline="Van & People-Carrier Rentals in Daytona Beach"
      schemas={[localBusinessSchema, buildFaqSchema(faqItems)]}
      subheadline="Moving a big group around Daytona Beach? Our vans keep everyone together without the convoy. They are perfect for family reunions, sporting events, and corporate outings."
      vehicleBody="Browse vans and large-capacity vehicles for airport transfers, reunions, and event weekends."
      vehicleHeading="Available Vans"
      vehicles={vehicles}
    />
  );
}
