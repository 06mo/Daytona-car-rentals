import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { MapPin, MessageCircle, ReceiptText } from "lucide-react";
import { PeriodChips } from "@/components/journey/PeriodChips";
import { TripSearch } from "@/components/home/TripSearch";
import { JourneyLink } from "@/components/journey/JourneyProvider";
import { VehicleCard } from "@/components/fleet/VehicleCard";
import { directVehicles } from "@/lib/data/rentalChannels";
export const metadata: Metadata = {
  title: "Daytona Car Rentals · Your trip. Your way.",
  description:
    "Choose a local car in Daytona Beach. Clear trip quotes, reviewed direct-rental requests, and Turo booking options.",
};
export default function HomePage() {
  return (
    <>
      <section className="container home-hero">
        <div className="hero-copy">
          <p className="eyebrow">DAYTONA BEACH, FLORIDA</p>
          <h1>
            Your days. Your plans.
            <br />
            <em>Your way.</em>
          </h1>
          <p className="hero-description">
            Local errands, work weeks or time away.
            <br />
            Find your car for a few days, a week or a monthly term.
          </p>
          <div className="hero-actions">
            <JourneyLink className="journey-primary" href="/fleet">
              Browse cars
            </JourneyLink>
            <JourneyLink className="journey-secondary" href="/assistant">
              Help me choose
            </JourneyLink>
          </div>
          <PeriodChips />
          <div className="hero-location">
            <MapPin size={18} />
            <span>Local pickup · Airport delivery by arrangement</span>
          </div>
        </div>
        <div className="hero-photo">
          <Image
            src="/images/corolla-2020.jpeg"
            alt="2020 Toyota Corolla from our direct-request fleet"
            fill
            priority
            sizes="(max-width: 760px) 100vw, 50vw"
          />
          <span className="photo-label">
            DIRECT RENTAL · SUBJECT TO APPROVAL
            <br />
            <strong>2020 Toyota Corolla · 5 seats</strong>
          </span>
        </div>
        <div className="hero-search">
          <TripSearch />
        </div>
      </section>
      <section
        className="container service-strip"
        aria-label="Rental essentials"
      >
        {[
          {
            icon: ReceiptText,
            title: "Plan your term",
            text: "A few days, a week or up to 30 days at a time.",
          },
          {
            icon: MapPin,
            title: "Keep it local",
            text: "Appointment pickup in Daytona Beach.",
          },
          {
            icon: MessageCircle,
            title: "Talk to a person",
            text: "Real help before and during your trip.",
          },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title}>
            <Icon />
            <span>
              <strong>{title}</strong>
              <small>{text}</small>
            </span>
          </div>
        ))}
      </section>
      <section className="container fleet-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">A CAR FOR YOUR PLANS</p>
            <h2>Less searching. More going.</h2>
          </div>
          <Link href="/fleet" className="text-link">
            Explore all cars
          </Link>
        </div>
        <div className="car-grid">
          {directVehicles.slice(0, 3).map((v) => (
            <VehicleCard key={v.id} vehicle={v} />
          ))}
        </div>
      </section>
      <section id="how-it-works" className="steps-section">
        <div className="container">
          <p className="eyebrow">DIRECT REQUESTS, PERSONALLY REVIEWED</p>
          <h2>A little planning. A lot of freedom.</h2>
          <div className="steps-grid">
            {[
              {
                n: "01",
                title: "Choose",
                text: "Pick your dates, location and car. See the trip total before you continue.",
              },
              {
                n: "02",
                title: "Sign in",
                text: "Verify your email, then share renter information securely for owner review.",
              },
              {
                n: "03",
                title: "Review",
                text: "Check your trip and submit a request. We confirm after reviewing eligibility and availability.",
              },
            ].map((s) => (
              <article key={s.n}>
                <span>{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
