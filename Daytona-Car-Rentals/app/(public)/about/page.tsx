import Link from "next/link";
export const metadata = { title: "Local to Daytona · Daytona Car Rentals" };
export default function AboutPage() {
  return (
    <section className="container page-section narrow">
      <p className="eyebrow">LOCAL TO DAYTONA</p>
      <h1>More freedom. Less fuss.</h1>
      <p className="page-intro">
        A local fleet for a family weekend, a beach escape or getting around
        town. Choose from cars, SUVs, vans and a pickup truck.
      </p>
      <div className="panel">
        <h2>Two ways to book</h2>
        <p>
          Choose dates for a direct-rental request when available, or use a
          vehicle’s Turo listing. Direct requests require our review; Turo
          bookings follow the platform’s own terms and protection options.
        </p>
        <Link className="text-link" href="/fleet">
          Meet the fleet
        </Link>
      </div>
      <div className="panel">
        <h2>Pickup that makes sense</h2>
        <p>
          Appointment pickup in Daytona Beach. Airport delivery is arranged
          individually, subject to service availability and confirmed pickup
          instructions.
        </p>
        <Link className="text-link" href="/contact">
          Talk to our team
        </Link>
      </div>
    </section>
  );
}
