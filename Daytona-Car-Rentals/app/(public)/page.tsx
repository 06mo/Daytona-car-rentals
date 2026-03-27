import type { Metadata } from "next";

import { CTABanner } from "@/components/home/CTABanner";
import { FeaturedFleet } from "@/components/home/FeaturedFleet";
import { HeroSection } from "@/components/home/HeroSection";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Testimonials } from "@/components/home/Testimonials";
import { TrustBar } from "@/components/home/TrustBar";
import { WhyDaytona } from "@/components/home/WhyDaytona";

export const metadata: Metadata = {
  title: "Daytona Car Rentals — Affordable Car Hire in Daytona Beach",
  description:
    "Rent a car in Daytona Beach with no hidden fees. Economy, SUV, luxury, and van rentals available. Book online in minutes.",
};

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <TrustBar />
      <FeaturedFleet />
      <HowItWorks />
      <WhyDaytona />
      <Testimonials />
      <CTABanner />
    </>
  );
}
