import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact Us — Daytona Car Rentals",
  description:
    "Get in touch with Daytona Car Rentals. Find our location, phone number, email, and hours of operation.",
};

export default function ContactPage() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Contact Us</h1>
      <p className="mt-4 text-lg text-slate-600">
        Questions about a booking or need help choosing a vehicle? We're here.
      </p>

      <div className="mt-12 grid gap-10 md:grid-cols-2">
        {/* Contact details */}
        <div className="space-y-8">
          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50">
              <Phone className="h-5 w-5 text-brand-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">Phone</p>
              <a
                href="tel:+13865550100"
                className="mt-1 text-slate-600 hover:text-brand-600"
              >
                (386) 555-0100
              </a>
              <p className="mt-1 text-sm text-slate-500">Mon–Sat 8 AM – 6 PM ET</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50">
              <Mail className="h-5 w-5 text-brand-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">Email</p>
              <a
                href="mailto:hello@daytonacarrentals.com"
                className="mt-1 text-slate-600 hover:text-brand-600"
              >
                hello@daytonacarrentals.com
              </a>
              <p className="mt-1 text-sm text-slate-500">We reply within one business day.</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50">
              <MapPin className="h-5 w-5 text-brand-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">Location</p>
              <p className="mt-1 text-slate-600">
                Near Daytona Beach International Airport
                <br />
                Daytona Beach, FL 32114
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Pickup and drop-off by appointment.
              </p>
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

          <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-medium text-slate-900">Booking questions?</p>
            <p className="mt-1">
              The fastest way to get help with an existing booking is through your{" "}
              <a href="/dashboard" className="text-brand-600 underline underline-offset-2">
                customer dashboard
              </a>
              , where you can view your reservation, upload documents, or request a
              cancellation.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
