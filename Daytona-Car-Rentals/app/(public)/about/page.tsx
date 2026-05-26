import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { TURO_HOST_URL } from "@/lib/data/vehicles";

export const metadata: Metadata = {
  title: "About Us — Daytona Car Rentals",
  description:
    "Daytona Car Rentals is a locally owned fleet in Daytona Beach, FL. We list all our vehicles on Turo for easy, insured bookings.",
};

export default function AboutPage() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight text-slate-900">About Us</h1>
      <p className="mt-4 text-lg text-slate-600">Locally owned and operated in Daytona Beach, Florida.</p>

      <div className="mt-12 grid gap-12 md:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Who We Are</h2>
          <p className="mt-3 text-slate-600">
            Daytona Car Rentals was founded to give visitors and residents a straightforward,
            honest alternative to the big national chains. No hidden fees, no long lines at the
            airport counter — just clean, well-maintained vehicles and a booking process that
            takes minutes.
          </p>
          <p className="mt-3 text-slate-600">
            We serve Daytona Beach International Airport, the beachside strip, and all major
            hotels and resorts in the area. Whether you need a compact for a long weekend or a
            full-size van for the whole crew, we have the right vehicle at a fair price.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-slate-900">Our Fleet</h2>
          <p className="mt-3 text-slate-600">
            Every vehicle in our fleet is cleaned and inspected before each rental. We carry
            economy sedans, SUVs, trucks, and passenger vans — all with modern safety features.
          </p>
          <p className="mt-3 text-slate-600">
            We update our fleet regularly so you always get a reliable, up-to-date vehicle
            rather than one that has been driven into the ground.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-slate-900">How It Works</h2>
          <p className="mt-3 text-slate-600">
            Browse our vehicles on this site, then book directly through Turo. Turo handles
            everything — payment, insurance, roadside assistance, and trip support — so your
            rental is protected from start to finish.
          </p>
          <p className="mt-3 text-slate-600">
            Once booked, coordinate your pickup location with us. We're flexible and happy to
            meet you at your hotel, the airport, or another convenient spot in Daytona Beach.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-slate-900">Why Daytona Beach</h2>
          <p className="mt-3 text-slate-600">
            Daytona Beach is one of Florida's most visited destinations — home to the Daytona
            500, Bike Week, Spring Break, and 23 miles of Atlantic coastline. Having your own
            wheels means exploring on your schedule, not the shuttle's.
          </p>
          <p className="mt-3 text-slate-600">
            We know the area inside out and are happy to give recommendations on where to go,
            what to see, and the best times to avoid traffic.
          </p>
        </div>
      </div>

      <div className="mt-12 rounded-[2rem] border border-orange-200 bg-orange-50 px-8 py-8">
        <p className="text-xl font-semibold text-slate-900">Ready to explore Daytona?</p>
        <p className="mt-2 text-slate-600">
          All of our vehicles are available to book right now through Turo.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href={TURO_HOST_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
          >
            View Our Fleet on Turo
            <ExternalLink className="h-4 w-4" />
          </a>
          <Link
            href="/fleet"
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Browse Fleet on This Site
          </Link>
        </div>
      </div>
    </section>
  );
}
