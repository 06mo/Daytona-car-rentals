import type { Metadata } from "next";
import { BriefcaseBusiness, Gem, ShieldCheck } from "lucide-react";

import { LandingPage } from "@/components/landing/LandingPage";
import type { FAQItem } from "@/components/landing/LandingFAQ";
import { buildFaqSchema, createLandingMetadata, localBusinessSchema } from "@/lib/data/localBusinessSchema";
import { listVehicles } from "@/lib/services/vehicleService";

export const metadata: Metadata = createLandingMetadata(
  "luxury",
  "Luxury Car Rentals in Daytona Beach | Premium Fleet",
  "Rent a luxury car in Daytona Beach. BMWs, Mercedes, and premium vehicles available for special occasions, business travel, and weekend getaways.",
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
    answer: "Standard rental insurance covers luxury vehicles. We also offer Collision Damage Waiver (CDW) as an add-on for full peace of mind.",
  },
  {
    question: "Do you offer airport delivery for luxury vehicles?",
    answer: "Contact us after booking and we will discuss collection options near Daytona Beach Airport.",
  },
];

export default async function LuxuryLandingPage() {
  const vehicles = await listVehicles({ available: true, category: "luxury" });

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
          body: "Carefully maintained luxury cars kept to the highest standard.",
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
      subheadline="Arrive in style. Our luxury fleet is available for anniversaries, corporate trips, race week VIP experiences, and anyone who simply wants to enjoy the drive."
      vehicleBody="Current premium availability for business travel, special occasions, and elevated weekend plans."
      vehicleHeading="Premium Fleet"
      vehicles={vehicles}
    />
  );
}
