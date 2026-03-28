import { rentalTermsSections } from "../../lib/data/rentalTerms";

type RentalTermsContentProps = {
  compact?: boolean;
};

export function RentalTermsContent({ compact = false }: RentalTermsContentProps) {
  return (
    <div className={compact ? "space-y-5 text-sm text-slate-600" : "space-y-8 text-sm leading-6 text-slate-600"}>
      {rentalTermsSections.map((section) => (
        <section key={section.title} className="space-y-3">
          <h2 className={compact ? "text-base font-semibold text-slate-900" : "text-xl font-semibold text-slate-900"}>
            {section.title}
          </h2>
          <div className="space-y-2">
            {section.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
