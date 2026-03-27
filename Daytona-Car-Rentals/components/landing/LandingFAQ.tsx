export type FAQItem = {
  question: string;
  answer: string;
};

type LandingFAQProps = {
  items: FAQItem[];
};

export function LandingFAQ({ items }: LandingFAQProps) {
  return (
    <section className="mx-auto max-w-4xl px-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Frequently Asked Questions</h2>
        <div className="mt-6 grid gap-6">
          {items.map((item) => (
            <div key={item.question}>
              <h3 className="text-lg font-semibold text-slate-900">{item.question}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">{item.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
