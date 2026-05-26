import type { Metadata } from "next";
import { BriefcaseBusiness, Gem, ShieldCheck } from "lucide-react";

import { LandingPage } from "@/components/landing/LandingPage";
import type { FAQItem } from "@/components/landing/LandingFAQ";
import { buildFaqSchema, createLandingMetadata, localBusinessSchema } from "@/lib/data/localBusinessSchema";
import { vehicles } from "@/lib/data/vehicles";

export const metadata: Metadata = createLandingMetadata(
  "luxury",
  "Premium Car Rentals in Daytona Beach | Late-Model Fleet",
  "Rent a late-model, well-maintained car in Daytona Beach for special occasions, business travel, or a standout weekend. Book through Turo — full insurance included.",
);

const faqItems: FAQItem[] = [
  {
    question: "What luxury cars are available?",
    answer: "Browse our current luxury inventory on the fleet page because availability changes. Book early, especially during race weeks.",
  },
  {
    question: "Are luxury rentals available for one day?",
    answer: "Yes. Minimum rental is one day for all vehicle categories.",
  },
  {
    question: "Is extra insurance required for luxury vehicles?",
    answer: "All bookings are through Turo, which includes protection plan options. No separate insurance card is required.",
  },
  {
    question: "Do you offer airport delivery for luxury vehicles?",
    answer: "Contact us after booking and we will discuss collection options near Daytona Beach Airport.",
  },
];

export default function LuxuryLandingPage() {
  const luxuryVehicles = vehicles.filter((v) => v.category === "luxury");
  const displayVehicles = luxuryVehicles.length > 0 ? luxuryVehicles : vehicles;

  return (
    <LandingPage
      badge="Premium · Special Occasions · Business Travel"
      ctaBody="Secure a premium vehicle for race week, executive travel, or a standout weekend in Daytona Beach."
      ctaHeading="Life's Too Short for an Ordinary Car."
      faqItems={faqItems}
      features={[
        {
          icon: Gem,
          title: "Premium Vehicles",
          body: "Carefully maintained cars kept to the highest standard.",
        },
        {
          icon: ShieldCheck,
          title: "Discreet & Professional",
          body: "Clean, polished vehicles delivered on time. No fuss.",
        },
        {
          icon: BriefcaseBusiness,
          title: "Flexible Duration",
          body: "Available for single days, weekends, or extended stays throughout Daytona Beach.",
        },
      ]}
      headline="Luxury Car Rentals in Daytona Beach"
      schemas={[localBusinessSchema, buildFaqSchema(faqItems)]}
      subheadline="Arrive in style. Our premium fleet is available for anniversaries, corporate trips, race week VIP experiences, and anyone who simply wants to enjoy the drive."
      vehicleBody="Current premium availability for business travel, special occasions, and elevated weekend plans."
      vehicleHeading="Premium Fleet"
      vehicles={displayVehicles}
    />
  );
}
