import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { MapPin, MessageCircle, ReceiptText } from "lucide-react";
import { TripSearch } from "@/components/home/TripSearch";
import { CarFinder } from "@/components/home/CarFinder";
import { VehicleCard } from "@/components/fleet/VehicleCard";
import { featuredVehicles } from "@/lib/data/vehicles";
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
            Your Daytona trip.
            <br />
            <em>Your way.</em>
          </h1>
          <p className="hero-description">
            Choose a car. See your total.
            <br />
            Let the good days begin.
          </p>
          <div className="hero-location">
            <MapPin size={18} />
            <span>Local pickup · Airport delivery by arrangement</span>
          </div>
        </div>
        <div className="hero-photo">
          <Image
            src="/images/kia-black-2024.jpeg"
            alt="Black Kia Carnival from our Daytona fleet"
            fill
            priority
            sizes="(max-width: 760px) 100vw, 50vw"
          />
          <span className="photo-label">
            ROOM FOR THE WHOLE CREW
            <br />
            <strong>Kia Carnival · 8 seats</strong>
          </span>
        </div>
        <div className="hero-search">
          <TripSearch />
          <CarFinder />
        </div>
      </section>
      <section
        className="container service-strip"
        aria-label="Rental essentials"
      >
        {[
          {
            icon: ReceiptText,
            title: "See your total",
            text: "Rental charges, taxes and fees together.",
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
          {featuredVehicles.map((v) => (
            <VehicleCard key={v.id} vehicle={v} />
          ))}
        </div>
      </section>
      <section id="how-it-works" className="steps-section">
        <div className="container">
          <p className="eyebrow">THREE SIMPLE SCREENS</p>
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
                title: "Verify",
                text: "Share your contact details. We’ll arrange secure driver and insurance checks.",
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
