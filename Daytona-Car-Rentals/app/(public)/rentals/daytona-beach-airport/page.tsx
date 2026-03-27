import type { Metadata } from "next";
import { Compass, MapPinned, Plane } from "lucide-react";

import { LandingPage } from "@/components/landing/LandingPage";
import type { FAQItem } from "@/components/landing/LandingFAQ";
import { buildFaqSchema, createLandingMetadata, localBusinessSchema } from "@/lib/data/localBusinessSchema";
import { listVehicles } from "@/lib/services/vehicleService";

export const metadata: Metadata = createLandingMetadata(
  "daytona-beach-airport",
  "Daytona Beach Airport Car Rental | Daytona Car Rentals",
  "Pick up your rental car at Daytona Beach Airport (DAB). No hidden fees, unlimited mileage options, and online booking in minutes.",
);

const faqItems: FAQItem[] = [
  {
    question: "Where exactly is pick-up?",
    answer: "Pick-up is at our location near Daytona Beach International Airport (DAB). Full address and directions are sent with your booking confirmation.",
  },
  {
    question: "Can I book a car and pick it up same day?",
    answer: "Yes. Book online and we will have your vehicle ready. We recommend at least 2 hours notice for same-day bookings.",
  },
  {
    question: "Do you offer a shuttle from the terminal?",
    answer: "Contact us when you land and we will arrange collection. Our team is minutes from the terminal.",
  },
  {
    question: "What documents do I need?",
    answer: "A valid driver's license and insurance card. You can upload these in advance during booking or bring them to pick-up.",
  },
];

export default async function DaytonaBeachAirportPage() {
  const vehicles = await listVehicles({ available: true });

  return (
    <LandingPage
      badge="Daytona Beach International Airport · DAB"
      ctaBody="Reserve ahead of arrival and step into a rental experience designed for quick airport-area pickup."
      ctaHeading="Ready to Roll? Your Daytona Beach Adventure Starts Here."
      faqItems={faqItems}
      features={[
        {
          icon: Plane,
          title: "Airport-Area Pick-Up",
          body: "Convenient collection near DAB with clear directions included in your booking confirmation.",
        },
        {
          icon: Compass,
          title: "No Hidden Fees",
          body: "The price you see at checkout is the price you pay. No surprise airport surcharges.",
        },
        {
          icon: MapPinned,
          title: "Flexible Returns",
          body: "Return your vehicle at the same location or our downtown drop-off point.",
        },
      ]}
      headline="Car Rental at Daytona Beach Airport"
      schemas={[localBusinessSchema, buildFaqSchema(faqItems)]}
      subheadline="Reserve your vehicle before you land. We offer quick pick-up near Daytona Beach International Airport with a full fleet of economy, SUV, and luxury cars ready for your trip."
      vehicleBody="All available vehicles near Daytona Beach and the airport corridor."
      vehicleHeading="Airport-Ready Rentals"
      vehicles={vehicles}
    />
  );
}
