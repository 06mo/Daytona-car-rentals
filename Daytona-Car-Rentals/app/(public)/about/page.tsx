import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us — Daytona Car Rentals",
  description:
    "Daytona Car Rentals is a locally owned car rental company serving Daytona Beach and the surrounding area. Learn about our fleet, values, and commitment to service.",
};

export default function AboutPage() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight text-slate-900">About Us</h1>
      <p className="mt-4 text-lg text-slate-600">
        Locally owned and operated in Daytona Beach, Florida.
      </p>

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
            economy sedans, SUVs, luxury vehicles, and passenger vans — all late-model with
            modern safety features.
          </p>
          <p className="mt-3 text-slate-600">
            We update our fleet regularly so you always get a reliable, up-to-date vehicle
            rather than one that's been driven into the ground.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-slate-900">How It Works</h2>
          <p className="mt-3 text-slate-600">
            Book online in minutes. Upload your driver's license and proof of insurance, and our
            team reviews your documents before your pickup date. Once approved, you're confirmed
            — no surprises at the counter.
          </p>
          <p className="mt-3 text-slate-600">
            A deposit is collected at booking. The remaining balance is settled at pickup.
            Cancellations are handled directly through your customer dashboard.
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
    </section>
  );
}
