import type { Metadata } from "next";
import { ExternalLink, Mail, MapPin, Phone } from "lucide-react";

import { TURO_HOST_URL } from "@/lib/data/vehicles";

export const metadata: Metadata = {
  title: "Contact Us — Daytona Car Rentals",
  description:
    "Get in touch with Daytona Car Rentals. Find our phone number, email, and hours of operation in Daytona Beach, FL.",
};

export default function ContactPage() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Contact Us</h1>
      <p className="mt-4 text-lg text-slate-600">
        Questions about a vehicle or need help choosing the right car? We're here.
      </p>

      <div className="mt-12 grid gap-10 md:grid-cols-2">
        {/* Contact details */}
        <div className="space-y-8">
          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50">
              <Phone className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="font-medium text-slate-900">Phone</p>
              <a href="tel:+13868984035" className="mt-1 text-slate-600 hover:text-orange-500">
                (386) 898-4035
              </a>
              <p className="mt-1 text-sm text-slate-500">Mon–Sat 8 AM – 6 PM ET</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50">
              <Mail className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="font-medium text-slate-900">Email</p>
              <a href="mailto:msooijir@gmail.com" className="mt-1 text-slate-600 hover:text-orange-500">
                msooijir@gmail.com
              </a>
              <p className="mt-1 text-sm text-slate-500">We reply within one business day.</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50">
              <MapPin className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="font-medium text-slate-900">Location</p>
              <a
                className="mt-1 inline-block text-slate-600 hover:text-orange-500"
                href="https://maps.google.com/?q=2500+W+International+Speedway+Blvd,+Daytona+Beach,+FL"
                rel="noreferrer"
                target="_blank"
              >
                2500 W International Speedway Blvd
                <br />
                Daytona Beach, FL 32114
              </a>
              <p className="mt-1 text-sm text-slate-500">Pickup and drop-off by appointment.</p>
            </div>
          </div>
        </div>

        {/* Hours */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Hours of Operation</h2>
          <table className="mt-4 w-full text-sm text-slate-600">
            <tbody className="divide-y divide-slate-100">
              {[
                ["Monday", "8:00 AM – 6:00 PM"],
                ["Tuesday", "8:00 AM – 6:00 PM"],
                ["Wednesday", "8:00 AM – 6:00 PM"],
                ["Thursday", "8:00 AM – 6:00 PM"],
                ["Friday", "8:00 AM – 6:00 PM"],
                ["Saturday", "9:00 AM – 4:00 PM"],
                ["Sunday", "Closed"],
              ].map(([day, hours]) => (
                <tr key={day}>
                  <td className="py-2 font-medium text-slate-700">{day}</td>
                  <td className="py-2 text-right">{hours}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-8 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-slate-600">
            <p className="font-medium text-slate-900">Ready to book?</p>
            <p className="mt-1">
              All bookings are handled through Turo, which provides instant confirmation, full
              insurance coverage, and 24/7 roadside assistance.
            </p>
            <a
              href={TURO_HOST_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 font-semibold text-orange-600 hover:text-orange-700"
            >
              View our fleet on Turo
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
