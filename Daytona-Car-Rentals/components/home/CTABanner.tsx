import { Button } from "@/components/ui/Button";

export function CTABanner() {
  return (
    <section className="px-6 pb-20">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 rounded-[2rem] bg-orange-500 px-8 py-10 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-100">Ready To Hit The Road?</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">Book your car today and get moving faster.</h2>
        </div>
        <Button
          asChild
          className="border-white bg-transparent text-white hover:bg-white hover:text-orange-600"
          href="/fleet"
          variant="secondary"
        >
          Book Your Car Today
        </Button>
      </div>
    </section>
  );
}
