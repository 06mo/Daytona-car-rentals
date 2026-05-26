import { ExternalLink } from "lucide-react";

import { TURO_HOST_URL } from "@/lib/data/vehicles";

type LandingHeroProps = {
  headline: string;
  subheadline: string;
  badge?: string;
};

export function LandingHero({ headline, subheadline, badge }: LandingHeroProps) {
  return (
    <section className="mx-auto max-w-3xl px-6 pt-16 text-center">
      {badge ? (
        <div className="inline-flex rounded-full bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-600">
          {badge}
        </div>
      ) : null}
      <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">{headline}</h1>
      <p className="mt-5 text-lg leading-8 text-slate-600">{subheadline}</p>
      <div className="mt-8">
        <a
          href={TURO_HOST_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-7 py-3.5 text-base font-semibold text-white shadow-md hover:bg-orange-600"
        >
          Book on Turo
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </section>
  );
}
