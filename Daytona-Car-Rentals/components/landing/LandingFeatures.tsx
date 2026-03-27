import type { LucideIcon } from "lucide-react";

export type LandingFeature = {
  icon: LucideIcon;
  title: string;
  body: string;
};

type LandingFeaturesProps = {
  features: LandingFeature[];
};

export function LandingFeatures({ features }: LandingFeaturesProps) {
  return (
    <section className="mx-auto max-w-6xl px-6">
      <div className="grid gap-4 md:grid-cols-3">
        {features.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <Icon className="h-6 w-6 text-orange-500" />
            <h2 className="mt-4 text-lg font-semibold text-slate-900">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
