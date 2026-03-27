import { Button } from "@/components/ui/Button";

type LandingCTAProps = {
  heading: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export function LandingCTA({
  heading,
  body,
  ctaLabel = "Browse Available Cars",
  ctaHref = "/fleet",
}: LandingCTAProps) {
  return (
    <section className="mx-auto max-w-6xl px-6">
      <div className="rounded-[2rem] border border-orange-200 bg-orange-50 px-6 py-10 shadow-sm sm:px-10">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900">{heading}</h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-700">{body}</p>
        <div className="mt-6">
          <Button asChild href={ctaHref}>{ctaLabel}</Button>
        </div>
      </div>
    </section>
  );
}
