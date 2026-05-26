import { ExternalLink } from "lucide-react";

import { TURO_HOST_URL } from "@/lib/data/vehicles";

export function CTABanner() {
  return (
    <section className="px-6 pb-20">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 rounded-[2rem] bg-orange-500 px-8 py-10 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-100">Ready To Hit The Road?</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">View all our cars and book instantly on Turo.</h2>
        </div>
        <a
          href={TURO_HOST_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-white bg-transparent px-6 py-3 text-sm font-semibold text-white transition hover:bg-white hover:text-orange-600"
        >
          Book on Turo
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </section>
  );
}
