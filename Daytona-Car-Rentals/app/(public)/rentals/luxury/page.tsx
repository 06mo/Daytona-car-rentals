import Link from "next/link";
export const metadata = {
  title: "Explore our fleet · Daytona Car Rentals",
  robots: { index: false, follow: true },
};
export default function LuxuryPage() {
  return (
    <section className="container page-section narrow">
      <p className="eyebrow">OUR CURRENT FLEET</p>
      <h1>Find your kind of comfortable.</h1>
      <p className="page-intro">
        We don’t currently list a dedicated luxury category. Explore our cars,
        SUVs, vans and truck instead.
      </p>
      <Link className="text-link" href="/fleet">
        Explore the fleet
      </Link>
    </section>
  );
}
