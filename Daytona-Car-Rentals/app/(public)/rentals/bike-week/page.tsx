import type { Metadata } from "next";
import { Car, Compass, Route } from "lucide-react";

import { LandingPage } from "@/components/landing/LandingPage";
import type { FAQItem } from "@/components/landing/LandingFAQ";
import { buildFaqSchema, createLandingMetadata, localBusinessSchema } from "@/lib/data/localBusinessSchema";
import { listVehicles } from "@/lib/services/vehicleService";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createLandingMetadata(
  "bike-week",
  "Car Rental During Bike Week Daytona Beach | Explore FL",
  "Need a car during Daytona Bike Week? Explore the area while the crowds gather on the strip. Easy online booking, full fleet available.",
);

const faqItems: FAQItem[] = [
  {
    question: "Is it hard to get around Daytona Beach during Bike Week?",
    answer: "Parts of the main strip can be congested, but a car gives you full flexibility to explore the wider area on your own schedule.",
  },
  {
    question: "What's the best vehicle type for Bike Week?",
    answer: "Most of our customers choose an economy or SUV. Economy cars are nimble in traffic, while SUVs are better if you are travelling in a group.",
  },
  {
    question: "When does Bike Week usually run?",
    answer: "Daytona Bike Week typically runs for 10 days in early-to-mid March. Check the official schedule and book your vehicle to cover your stay.",
  },
];

export default async function BikeWeekLandingPage() {
  const vehicles = await listVehicles({ available: true });

  return (
    <LandingPage
      badge="March · Daytona Beach, FL"
      ctaBody="Plan day trips, beach stops, and off-strip dinners without relying on crowded Bike Week traffic patterns."
      ctaHeading="Four Wheels, Your Rules — Even During Bike Week."
      faqItems={faqItems}
      features={[
        {
          icon: Car,
          title: "Beat the Traffic",
          body: "A car lets you explore beyond the Bike Week strip on your own schedule.",
        },
        {
          icon: Route,
          title: "Day Trips Made Easy",
          body: "St. Augustine, Kennedy Space Center, and Orlando attractions are all within reach.",
        },
        {
          icon: Compass,
          title: "Book Alongside Your Hotel",
          body: "Secure your rental at the same time you book accommodation because both fill up fast in March.",
        },
      ]}
      headline="Car Rental During Bike Week Daytona Beach"
      schemas={[localBusinessSchema, buildFaqSchema(faqItems)]}
      subheadline="Not everyone at Bike Week is on two wheels. Rent a car to explore New Smyrna Beach, St. Augustine, or the Kennedy Space Center while the action unfolds on Main Street."
      vehicleBody="Browse our current Bike Week-friendly fleet across economy, SUV, luxury, and van categories."
      vehicleHeading="Available Bike Week Rentals"
      vehicles={vehicles}
    />
  );
}
