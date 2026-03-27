import Link from "next/link";
import { Camera, Globe2, Mail, MapPin, Phone } from "lucide-react";

const exploreLinks = [
  { href: "/fleet", label: "Fleet" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

const supportLinks = [
  { href: "/contact", label: "FAQ" },
  { href: "/contact", label: "Terms" },
  { href: "/contact", label: "Privacy Policy" },
];

const rentalLinks = [
  { href: "/rentals/daytona-beach-airport", label: "Airport Rentals" },
  { href: "/rentals/suv", label: "SUV Rentals" },
  { href: "/rentals/luxury", label: "Luxury Cars" },
  { href: "/rentals/van", label: "Van Rentals" },
  { href: "/rentals/daytona-500", label: "Daytona 500" },
  { href: "/rentals/bike-week", label: "Bike Week" },
  { href: "/rentals/spring-break", label: "Spring Break" },
];

export function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-4">
          <div>
            <p className="text-lg font-semibold text-white">Daytona Car Rentals</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Premium cars, local expertise, and easy online booking for every Daytona trip.
            </p>
          </div>
          <div className="flex items-center gap-3 text-slate-300">
            <Globe2 className="h-5 w-5" />
            <Camera className="h-5 w-5" />
          </div>
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
            {supportLinks.map((link) => (
              <Link key={link.label} href={link.href} className="hover:text-white">
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Contact</p>
          <div className="grid gap-3 text-sm">
            <a className="flex items-center gap-2 hover:text-white" href="tel:+13868984035">
              <Phone className="h-4 w-4" />
              (386) 898-4035
            </a>
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              hello@daytonacarrentals.com
            </p>
            <a
              className="flex items-center gap-2 hover:text-white"
              href="https://maps.google.com/?q=2500+W+International+Speedway+Blvd,+Daytona+Beach,+FL"
              rel="noreferrer"
              target="_blank"
            >
              <MapPin className="h-4 w-4" />
              2500 W International Speedway Blvd, Daytona Beach, FL
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
        <div className="mx-auto max-w-6xl px-6 py-5 text-sm text-slate-500">
          © 2026 Daytona Car Rentals. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
