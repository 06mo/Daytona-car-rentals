import Link from "next/link";
import { ExternalLink, Mail, MapPin, Phone } from "lucide-react";

import { TURO_HOST_URL } from "@/lib/data/vehicles";

const exploreLinks = [
  { href: "/fleet", label: "Our Fleet" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
];

const rentalLinks = [
  { href: "/rentals/daytona-beach-airport", label: "Airport Rentals" },
  { href: "/rentals/suv", label: "SUV Rentals" },
  { href: "/rentals/van", label: "Van Rentals" },
  { href: "/rentals/daytona-500", label: "Daytona 500" },
  { href: "/rentals/bike-week", label: "Bike Week" },
  { href: "/rentals/spring-break", label: "Spring Break" },
  { href: "/rentals/luxury", label: "Luxury Cars" },
];

export function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-4">
          <div>
            <p className="text-lg font-semibold text-white">Daytona Car Rentals</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Locally owned fleet in Daytona Beach, FL. Book through Turo for instant, insured rentals.
            </p>
          </div>
          <a
            href={TURO_HOST_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
          >
            View on Turo
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Explore</p>
          <div className="grid gap-2 text-sm">
            {exploreLinks.map((link) => (
              <Link key={link.label} href={link.href} className="hover:text-white">
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Support</p>
          <div className="grid gap-2 text-sm">
            <Link href="/contact" className="hover:text-white">FAQ</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <a
              href={TURO_HOST_URL}
              target="_blank"
              rel="noreferrer"
              className="hover:text-white"
            >
              Book a Car
            </a>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Contact</p>
          <div className="grid gap-3 text-sm">
            <a className="flex items-center gap-2 hover:text-white" href="tel:+13868984035">
              <Phone className="h-4 w-4" />
              (386) 898-4035
            </a>
            <a className="flex items-center gap-2 hover:text-white" href="mailto:hello@daytonacarrentals.com">
              <Mail className="h-4 w-4" />
              hello@daytonacarrentals.com
            </a>
            <a
              className="flex items-center gap-2 hover:text-white"
              href="https://maps.google.com/?q=2500+W+International+Speedway+Blvd,+Daytona+Beach,+FL"
              rel="noreferrer"
              target="_blank"
            >
              <MapPin className="h-4 w-4" />
              Daytona Beach, FL
            </a>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Rentals</p>
          <div className="grid gap-2 text-sm">
            {rentalLinks.map((link) => (
              <Link key={link.label} href={link.href} className="hover:text-white">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-slate-800">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-5 text-sm text-slate-500">
          <span>© 2026 Daytona Car Rentals. All rights reserved.</span>
          <span>
            Bookings handled securely through{" "}
            <a href={TURO_HOST_URL} target="_blank" rel="noreferrer" className="hover:text-white underline underline-offset-2">
              Turo
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
