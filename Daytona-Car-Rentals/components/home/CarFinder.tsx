"use client";
import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { vehicles } from "@/lib/data/vehicles";
export function CarFinder() {
  const [need, setNeed] = useState(""),
    [searched, setSearched] = useState(false);
  const van = /family|group|eight|8|seven|7|van|luggage/i.test(need),
    truck = /truck|pickup truck/i.test(need),
    suv = /suv|space/i.test(need);
  const matches = vehicles
    .filter(
      (v) =>
        v.category ===
        (van ? "van" : truck ? "truck" : suv ? "suv" : "economy"),
    )
    .slice(0, 2);
  return (
    <div className="finder">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSearched(true);
        }}
      >
        <Input
          id="car-needs"
          label="Need help choosing?"
          placeholder="An eight-seat van for a family weekend"
          value={need}
          onChange={(e) => {
            setNeed(e.target.value);
            setSearched(false);
          }}
          required
          maxLength={200}
        />
        <Button variant="outline" type="submit">
          Find a fit
        </Button>
      </form>
      {searched && (
        <div className="finder-results" aria-live="polite">
          <p>
            {van
              ? "The Carnival seats eight. Check luggage space with us before booking."
              : "These cars may fit your trip. Choose dates to check pricing."}
          </p>
          {matches.map((v) => (
            <Link key={v.id} href={`/booking?vehicle=${v.id}`}>
              {v.make} {v.model} · {v.seats} seats
            </Link>
          ))}
          <small>
            This guided selector suggests cars; it does not confirm availability
            or coverage.
          </small>
        </div>
      )}
    </div>
  );
}
