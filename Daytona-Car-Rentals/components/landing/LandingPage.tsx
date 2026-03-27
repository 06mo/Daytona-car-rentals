import type { ReactNode } from "react";

import { JsonLd } from "@/components/landing/JsonLd";
import { LandingCTA } from "@/components/landing/LandingCTA";
import { type FAQItem, LandingFAQ } from "@/components/landing/LandingFAQ";
import { type LandingFeature, LandingFeatures } from "@/components/landing/LandingFeatures";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingVehicleSection } from "@/components/landing/LandingVehicleSection";
import type { Vehicle } from "@/types";

type LandingPageProps = {
  headline: string;
  subheadline: string;
  badge?: string;
  features: LandingFeature[];
  faqItems: FAQItem[];
  vehicles: Vehicle[];
  vehicleHeading?: string;
  vehicleBody?: string;
  ctaHeading: string;
  ctaBody: string;
  schemas: Record<string, unknown>[];
  notice?: ReactNode;
};

export function LandingPage({
  headline,
  subheadline,
  badge,
  features,
  faqItems,
  vehicles,
  vehicleHeading = "Available Vehicles",
  vehicleBody = "Browse a curated selection from our Daytona Beach rental fleet.",
  ctaHeading,
  ctaBody,
  schemas,
  notice,
}: LandingPageProps) {
  return (
    <>
      {schemas.map((schema, index) => (
        <JsonLd key={index} schema={schema} />
      ))}
      <div className="space-y-16 py-10">
        <LandingHero badge={badge} headline={headline} subheadline={subheadline} />
        {notice ? <section className="mx-auto max-w-4xl px-6">{notice}</section> : null}
        <LandingFeatures features={features} />
        <LandingVehicleSection body={vehicleBody} heading={vehicleHeading} vehicles={vehicles} />
        <LandingFAQ items={faqItems} />
        <LandingCTA body={ctaBody} heading={ctaHeading} />
      </div>
    </>
  );
}
