import type { Metadata } from "next";
import { CarFront, Route, UsersRound } from "lucide-react";

import { LandingPage } from "@/components/landing/LandingPage";
import type { FAQItem } from "@/components/landing/LandingFAQ";
import { buildFaqSchema, createLandingMetadata, localBusinessSchema } from "@/lib/data/localBusinessSchema";
import { listVehicles } from "@/lib/services/vehicleService";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createLandingMetadata(
  "suv",
  "SUV Rentals in Daytona Beach | Spacious & Comfortable",
  "Rent an SUV in Daytona Beach for families, groups, and road trips. Spacious interiors, ample luggage space, and online booking.",
);

const faqItems: FAQItem[] = [
  {
    question: "How many passengers fit in your SUVs?",
    answer: "Our SUVs seat between 5 and 8 passengers depending on the model. Seating capacity is shown on each vehicle listing.",
  },
  {
    question: "Do you have SUVs with unlimited mileage?",
    answer: "Most of our SUVs include unlimited mileage. Check the individual vehicle listing for mileage policy details.",
  },
  {
    question: "Can I drive to Orlando in a rental SUV?",
    answer: "Yes. Interstate driving within Florida is fully permitted under our rental agreement.",
  },
  {
    question: "Is there a deposit required?",
    answer: "A refundable deposit is charged at the time of booking. The amount varies by vehicle and is shown clearly before checkout.",
  },
];

export default async function SuvLandingPage() {
  const vehicles = await listVehicles({ available: true, category: "suv" });

  return (
    <LandingPage
      badge="Families · Groups · Road Trips"
      ctaBody="Choose an SUV that balances comfort, cargo space, and road-trip freedom across Daytona Beach and beyond."
      ctaHeading="Plenty of Room, Zero Compromise."
      faqItems={faqItems}
      features={[
        {
          icon: UsersRound,
          title: "Family-Ready Space",
          body: "Seating for 5–8 with cargo room for luggage, beach gear, and strollers.",
        },
        {
          icon: Route,
          title: "All-Terrain Capable",
          body: "Comfortable on highway and beach-access roads alike.",
        },
        {
          icon: CarFront,
          title: "Competitive Daily Rates",
          body: "Transparent SUV pricing with no mileage surprises on most models.",
        },
      ]}
      headline="SUV Rentals in Daytona Beach"
      schemas={[localBusinessSchema, buildFaqSchema(faqItems)]}
      subheadline="Need space for the whole crew? Our SUV fleet handles Daytona's beaches, outlet malls, and day trips to Orlando with room to spare."
      vehicleBody="Explore our available SUVs for families, golf weekends, and Florida road trips."
      vehicleHeading="Available SUVs"
      vehicles={vehicles}
    />
  );
}
