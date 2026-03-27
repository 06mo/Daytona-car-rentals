import Image from "next/image";
import { CheckCircle2 } from "lucide-react";

const reasons = [
  "No hidden fees",
  "Local Daytona knowledge",
  "24/7 roadside assistance",
  "Flexible cancellation",
];

export function WhyDaytona() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.05fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">Why Daytona</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Why Rent With Us?</h2>
          <p className="mt-4 max-w-xl text-slate-600">
            We keep the process clear, local, and dependable so you can spend less time figuring out logistics and more
            time enjoying the coast.
          </p>
          <div className="mt-8 grid gap-4">
            {reasons.map((reason) => (
              <div key={reason} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
                <CheckCircle2 className="h-5 w-5 text-orange-500" />
                <span className="font-medium text-slate-700">{reason}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[2rem] shadow-xl">
          <Image
            alt="Illustration of a Daytona rental handoff"
            className="h-full w-full object-cover"
            height={720}
            src="/images/daytona-handover.svg"
            width={900}
          />
        </div>
      </div>
    </section>
  );
}
