import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { TURO_HOST_URL } from "@/lib/data/vehicles";

export function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="absolute inset-0">
        <Image
          alt="Stylized Daytona coastal highway background"
          className="object-cover"
          fill
          priority
          src="/images/hero-road.svg"
        />
        <div className="absolute inset-0 bg-slate-950/65" />
      </div>

      <div className="relative mx-auto flex min-h-[580px] max-w-6xl flex-col items-center justify-center px-6 py-24 text-center">
        <div className="max-w-3xl space-y-6">
          <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-orange-200">
            Daytona Beach · Locally Owned · Booked via Turo
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Premium Cars.<br />Simple Rentals.
          </h1>
          <p className="text-lg text-slate-200">
            Explore Daytona in style with a local fleet built for beach weekends, race days,
            and road trips. Book through Turo for instant confirmation, full insurance, and
            24/7 roadside assistance.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href={TURO_HOST_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-7 py-3.5 text-base font-semibold text-white shadow-lg transition hover:bg-orange-600"
            >
              Book on Turo
              <ExternalLink className="h-4 w-4" />
            </a>
            <Link
              href="/fleet"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-7 py-3.5 text-base font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              Browse Our Fleet
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
