import type { Metadata } from "next";
import { Bus, CalendarRange, Users } from "lucide-react";

import { LandingPage } from "@/components/landing/LandingPage";
import type { FAQItem } from "@/components/landing/LandingFAQ";
import { buildFaqSchema, createLandingMetadata, localBusinessSchema } from "@/lib/data/localBusinessSchema";
import { vehicles } from "@/lib/data/vehicles";

export const metadata: Metadata = createLandingMetadata(
  "van",
  "Van Rentals in Daytona Beach | 8-Passenger Kia Carnival",
  "Rent a 2024 Kia Carnival 8-passenger van in Daytona Beach. Perfect for families, group travel, airport transfers & events. Book through Turo. Call (386) 898-4035.",
);

const faqItems: FAQItem[] = [
  {
    question: "How many people fit in your vans?",
    answer: "Our Kia Carnival vans seat 8 passengers comfortably with room for luggage.",
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
    answer: "Yes. Turo pricing adjusts automatically based on your rental duration.",
  },
];

export default function VanLandingPage() {
  const vanVehicles = vehicles.filter((v) => v.category === "van");
  const displayVehicles = vanVehicles.length > 0 ? vanVehicles : vehicles;

  return (
    <LandingPage
      badge="Large Groups · Up to 8 Passengers"
      ctaBody="Keep your group together with a Daytona van rental built for airport pickups, events, and shared travel plans."
      ctaHeading="The Whole Group Travels Together."
      faqItems={faqItems}
      features={[
        {
          icon: Users,
          title: "Maximum Capacity",
          body: "Seats up to 8 passengers with luggage space for extended trips.",
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
      headline="Van Rentals in Daytona Beach"
      schemas={[localBusinessSchema, buildFaqSchema(faqItems)]}
      subheadline="Moving a big group around Daytona Beach? Our Kia Carnival vans keep everyone together without the convoy. Perfect for family reunions, sporting events, and corporate outings."
      vehicleBody="Browse vans and large-capacity vehicles for airport transfers, reunions, and event weekends."
      vehicleHeading="Available Vans"
      vehicles={displayVehicles}
    />
  );
}
