import { Button } from "@/components/ui/Button";

type LandingHeroProps = {
  headline: string;
  subheadline: string;
  ctaLabel?: string;
  ctaHref?: string;
  badge?: string;
};

export function LandingHero({
  headline,
  subheadline,
  ctaLabel = "Browse Available Cars",
  ctaHref = "/fleet",
  badge,
}: LandingHeroProps) {
  return (
    <section className="mx-auto max-w-3xl px-6 pt-16 text-center">
      {badge ? (
        <div className="inline-flex rounded-full bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-600">
          {badge}
        </div>
      ) : null}
      <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">{headline}</h1>
      <p className="mt-5 text-lg leading-8 text-slate-600">{subheadline}</p>
      <div className="mt-8">
        <Button asChild href={ctaHref} size="lg">{ctaLabel}</Button>
      </div>
    </section>
  );
}
