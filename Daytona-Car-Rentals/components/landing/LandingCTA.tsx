import { ExternalLink } from "lucide-react";

import { TURO_HOST_URL } from "@/lib/data/vehicles";

type LandingCTAProps = {
  heading: string;
  body: string;
  ctaLabel?: string;
};

export function LandingCTA({
  heading,
  body,
  ctaLabel = "Book on Turo",
}: LandingCTAProps) {
  return (
    <section className="mx-auto max-w-6xl px-6">
      <div className="rounded-[2rem] border border-orange-200 bg-orange-50 px-6 py-10 shadow-sm sm:px-10">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900">{heading}</h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-700">{body}</p>
        <div className="mt-6">
          <a
            href={TURO_HOST_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-600"
          >
            {ctaLabel}
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
