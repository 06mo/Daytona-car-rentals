import type { Metadata } from "next";

import { RentalTermsContent } from "@/components/legal/RentalTermsContent";

export const metadata: Metadata = {
  title: "Rental Terms & Conditions — Daytona Car Rentals",
  description:
    "Review the rental terms and conditions for Daytona Car Rentals, including payment, pickup, return, protection, insurance, and driver responsibilities.",
};

export default function TermsPage() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-16">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-orange-500">Legal</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">Rental Terms & Conditions</h1>
        <p className="mt-4 text-lg text-slate-600">
          These terms apply to Daytona Car Rentals reservations and become part of the rental agreement when a customer
          proceeds with booking and pickup.
        </p>
      </div>

      <div className="mt-10 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <RentalTermsContent />
      </div>
    </section>
  );
}
