import Link from "next/link";
export const metadata = { title: "Pickup & help · Daytona Car Rentals" };
export default function ContactPage() {
  return (
    <section className="container page-section narrow">
      <p className="eyebrow">REAL PEOPLE. LOCAL HELP.</p>
      <h1>Let’s get you moving.</h1>
      <p className="page-intro">
        Questions about a car, airport delivery or your request? Talk to our
        Daytona team.
      </p>
      <div className="form-grid">
        <div className="panel">
          <h2>Call or email</h2>
          <p>
            <a className="text-link" href="tel:+13868984035">
              (386) 898-4035
            </a>
            <br />
            <a className="text-link" href="mailto:hello@daytonacarrentals.com">
              hello@daytonacarrentals.com
            </a>
          </p>
          <p>
            Monday–Friday: 8 AM–6 PM
            <br />
            Saturday: 9 AM–4 PM
            <br />
            Sunday: closed
            <br />
            All times Eastern.
          </p>
        </div>
        <div className="panel">
          <h2>Appointment pickup</h2>
          <p>
            2500 W International Speedway Blvd
            <br />
            Daytona Beach, FL 32114
          </p>
          <p>
            Confirm your appointment and exact meeting instructions with us
            before arrival. DAB airport delivery is by arrangement.
          </p>
        </div>
      </div>
      <div className="panel">
        <h2>Already have a request?</h2>
        <p>
          Have your reference handy. We’ll verify your identity before sharing
          trip information. Don’t send license images or insurance documents by
          email.
        </p>
        <Link className="text-link" href="/my-trip">
          Trip support
        </Link>
      </div>
    </section>
  );
}
