import type { Metadata } from "next";
import { CreditCard, TentTree, UsersRound } from "lucide-react";

import { LandingPage } from "@/components/landing/LandingPage";
import type { FAQItem } from "@/components/landing/LandingFAQ";
import { buildFaqSchema, createLandingMetadata, localBusinessSchema } from "@/lib/data/localBusinessSchema";
import { listVehicles } from "@/lib/services/vehicleService";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createLandingMetadata(
  "spring-break",
  "Spring Break Car Rental Daytona Beach | Groups Welcome",
  "Rent a car or van for Spring Break in Daytona Beach. Great rates for groups. Book early — March and April availability fills fast.",
);

const faqItems: FAQItem[] = [
  {
    question: "How old do you need to be to rent a car?",
    answer: "Renters must be 21 or older with a valid driver's license. Additional young driver fees may apply for renters under 25.",
  },
  {
    question: "Can multiple people drive the rental?",
    answer: "Yes. Add an Additional Driver during checkout. Each authorised driver must be listed and present their license at pick-up.",
  },
  {
    question: "What's the best vehicle for a group of 6?",
    answer: "An SUV comfortably seats 5–7. For 6+ we recommend checking our van availability for extra comfort and luggage space.",
  },
  {
    question: "Is there a minimum rental period during Spring Break?",
    answer: "No minimum. You can rent for a single day or the full week. Long-term discounts apply automatically for 7+ day rentals.",
  },
];

export default async function SpringBreakLandingPage() {
  const [suvs, vans] = await Promise.all([
    listVehicles({ available: true, category: "suv" }),
    listVehicles({ available: true, category: "van" }),
  ]);
  const vehicles = [...suvs, ...vans].sort((first, second) => second.seats - first.seats);

  return (
    <LandingPage
      badge="March – April · Groups Welcome"
      ctaBody="Reserve early for March and April travel so your group has the space, luggage room, and pricing clarity you need."
      ctaHeading="Spring Break Hits Different With Your Own Wheels."
      faqItems={faqItems}
      features={[
        {
          icon: UsersRound,
          title: "Group-Friendly Fleet",
          body: "From 5-seat SUVs to 12-seat vans, the whole group can travel in one vehicle.",
        },
        {
          icon: TentTree,
          title: "Freedom to Explore",
          body: "Daytona's best spots are spread out, and a rental car opens up the whole coastline.",
        },
        {
          icon: CreditCard,
          title: "Transparent Group Pricing",
          body: "Split one daily rate between the group. It is often cheaper than rideshare for multiple trips.",
        },
      ]}
      headline="Spring Break Car Rental in Daytona Beach"
      notice={
        <div className="rounded-[2rem] border border-orange-300 bg-orange-50 px-6 py-5 text-sm leading-7 text-slate-700 shadow-sm">
          <strong className="text-slate-900">Book Early for Spring Break:</strong> March and April are peak season in Daytona Beach.
          Vehicle availability is limited, so reserve your car as soon as your travel dates are confirmed.
        </div>
      }
      schemas={[localBusinessSchema, buildFaqSchema(faqItems)]}
      subheadline="Daytona Beach is Florida's Spring Break capital. Whether you're rolling in a group or flying solo, a rental car means you call the shots for beach days, road trips, theme parks, and everything in between."
      vehicleBody="Group-friendly SUVs and vans for beach weekends, airport arrivals, and shared Spring Break itineraries."
      vehicleHeading="Group-Friendly Spring Break Rentals"
      vehicles={vehicles}
    />
  );
}
