"use client";
import { useState } from "react";
import { VehicleCard } from "./VehicleCard";
import { rentalFleet, isDirectRental } from "@/lib/data/rentalChannels";
import { JourneyFields } from "@/components/journey/JourneyFields";
import { JourneyLink } from "@/components/journey/JourneyProvider";
export function FleetBrowser({ initialCategory = "all", initialChannel = "all" }: { initialCategory?: string; initialChannel?: string }) {
  const [category, setCategory] = useState(["economy", "suv", "van", "truck"].includes(initialCategory) ? initialCategory : "all"),
    [channel, setChannel] = useState(["direct", "turo"].includes(initialChannel) ? initialChannel : "all");
  function filter(key: "category" | "channel", value: string) {
    if (key === "category") setCategory(value); else setChannel(value);
    const url = new URL(window.location.href);
    url.searchParams.set(key, value);
    window.history.replaceState(null, "", url.pathname + url.search);
  }
  const matches = rentalFleet.filter((v) => (category === "all" || category === v.category) && (channel === "all" || (channel === "direct") === isDirectRental(v.id)));
  return <>
    <JourneyFields compact />
    <div className="filter-tabs" aria-label="Rental channels">{[["all", "All booking options"], ["direct", "Direct rental"], ["turo", "Book on Turo"]].map(([id, label]) => <button key={id} className={channel === id ? "active" : ""} aria-pressed={channel === id} onClick={() => filter("channel", id)}>{label}</button>)}</div>
    <div className="filter-tabs" aria-label="Vehicle categories">{[["all", "All cars"], ["economy", "Cars"], ["suv", "SUVs"], ["van", "Vans"], ["truck", "Truck"]].map(([id, label]) => <button key={id} className={category === id ? "active" : ""} aria-pressed={category === id} onClick={() => filter("category", id)}>{label}</button>)}</div>
    <p role="status">{matches.length} vehicles · <JourneyLink href="/assistant">Help me choose</JourneyLink></p>
    <div className="car-grid">{matches.map((v) => <VehicleCard key={v.id} vehicle={v} />)}</div>
    {!matches.length && <p>No cars in this combination. Try another filter.</p>}
  </>;
}
