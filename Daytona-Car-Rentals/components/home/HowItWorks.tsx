import { CarFront, CreditCard, KeyRound } from "lucide-react";

const steps = [
  {
    icon: CarFront,
    title: "Choose Your Car",
    description: "Browse our fleet, compare styles, and find the right fit for your trip and budget.",
  },
  {
    icon: CreditCard,
    title: "Book & Pay Online",
    description: "Select your dates, reserve in minutes, and secure your rental with Stripe.",
  },
  {
    icon: KeyRound,
    title: "Pick Up & Drive",
    description: "Show your ID, collect the keys, and get on the road without the usual hassle.",
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">How It Works</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Three simple steps from landing to driving</h2>
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-3">
        {steps.map((step, index) => {
          const Icon = step.icon;

          return (
            <div key={step.title} className="relative rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <Icon className="h-6 w-6 text-orange-500" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{step.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
