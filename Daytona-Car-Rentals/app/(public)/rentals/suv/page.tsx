import type { Metadata } from "next";
import { CarFront, Route, UsersRound } from "lucide-react";

import { LandingPage } from "@/components/landing/LandingPage";
import type { FAQItem } from "@/components/landing/LandingFAQ";
import { buildFaqSchema, createLandingMetadata, localBusinessSchema } from "@/lib/data/localBusinessSchema";
import { vehicles } from "@/lib/data/vehicles";

export const metadata: Metadata = createLandingMetadata(
  "suv",
  "SUV Rentals in Daytona Beach, FL | Local Turo Host",
  "Rent an SUV in Daytona Beach from a local host. Hyundai Santa Fe Sport with AWD, Ford EcoSport & more. Book through Turo with full insurance. Call (386) 898-4035.",
);

const faqItems: FAQItem[] = [
  {
    question: "How many passengers fit in your SUVs?",
    answer: "Our SUVs seat 5 passengers. Seating capacity is shown on each vehicle listing on Turo.",
  },
  {
    question: "Do you have SUVs with unlimited mileage?",
    answer: "Most of our SUVs include unlimited mileage. Check the individual vehicle listing on Turo for mileage policy details.",
  },
  {
    question: "Can I drive to Orlando in a rental SUV?",
    answer: "Yes. Interstate driving within Florida is fully permitted under Turo's standard rental terms.",
  },
  {
    question: "Is there a deposit required?",
    answer: "Turo handles all deposits and security holds. The amount is shown clearly before you confirm your booking.",
  },
];

export default function SuvLandingPage() {
  const suvVehicles = vehicles.filter((v) => v.category === "suv");
  const displayVehicles = suvVehicles.length > 0 ? suvVehicles : vehicles;

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
          body: "Seating for 5 with cargo room for luggage, beach gear, and strollers.",
        },
        {
          icon: Route,
          title: "Road-Trip Capable",
          body: "Comfortable on highway and beach-access roads alike.",
        },
        {
          icon: CarFront,
          title: "Competitive Daily Rates",
          body: "Transparent SUV pricing on Turo with no mileage surprises on most models.",
        },
      ]}
      headline="SUV Rentals in Daytona Beach"
      schemas={[localBusinessSchema, buildFaqSchema(faqItems)]}
      subheadline="Need space for the whole crew? Our SUV fleet handles Daytona's beaches, outlet malls, and day trips to Orlando with room to spare."
      vehicleBody="Explore our available SUVs for families, golf weekends, and Florida road trips."
      vehicleHeading="Available SUVs"
      vehicles={displayVehicles}
    />
  );
}
