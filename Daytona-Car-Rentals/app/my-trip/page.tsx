import Link from "next/link";
import { Button } from "@/components/ui/Button";
export default function MyTripPage() {
  return (
    <section className="container page-section narrow">
      <p className="eyebrow">MY TRIP</p>
      <h1>A person, when you need one.</h1>
      <p className="page-intro">
        For the direct-rental pilot, our local team handles trip updates.
        Contact us with your request reference. We’ll verify your identity
        before discussing personal information or changing a booking.
      </p>
      <div className="panel">
        <h2>Direct booking request</h2>
        <p>
          Call (386) 898-4035 or email hello@daytonacarrentals.com. Don’t send
          license images or insurance documents by email.
        </p>
        <Button asChild href="tel:+13868984035">
          Call our team
        </Button>
      </div>
      <div className="panel">
        <h2>Booked through Turo?</h2>
        <p>
          Use your Turo trip for messages, changes, payment and platform
          support.
        </p>
        <Link
          className="text-link"
          href="https://turo.com"
          target="_blank"
          rel="noreferrer"
        >
          Open Turo
        </Link>
      </div>
    </section>
  );
}
