"use client";
import { useState } from "react";
import { VehicleCard } from "@/components/fleet/VehicleCard";
import { rentalFleet } from "@/lib/data/rentalChannels";
import { JourneyFields } from "@/components/journey/JourneyFields";
import { JourneyLink, useJourney } from "@/components/journey/JourneyProvider";
export function CarFinder() {
  const { update } = useJourney();
  const [kind, setKind] = useState("suv");
  const matches = rentalFleet.filter((v) => v.category === kind).slice(0, 2);
  return <div className="guided-selection">
    <div className="filter-tabs" aria-label="Choose your needs">
      <button onClick={() => { update({ period: "weekly" }); setKind("economy"); }}>Weekly transportation</button>
      <button onClick={() => { update({ period: "monthly" }); setKind("economy"); }}>Monthly transportation</button>
      <button aria-pressed={kind === "suv"} onClick={() => setKind("suv")}>Compare SUVs</button>
      <button aria-pressed={kind === "van"} onClick={() => setKind("van")}>Room for a group</button>
    </div>
    <h2>{kind === "suv" ? "Santa Fe Sport or EcoSport?" : kind === "van" ? "Traveling together" : "Everyday transportation"}</h2>
    <p>{kind === "suv" ? "Both seat five. Santa Fe Sport: AWD and a sunroof. EcoSport: compact size and a roof rack. Confirm luggage space with us." : "Compare seating and vehicle details. Your selected rental period and dates stay with you."}</p>
    <div className="comparison-grid">{matches.map((v) => <VehicleCard key={v.id} vehicle={v} showFeatures />)}</div>
    <JourneyFields compact />
    <p className="small-note">Direct requests need operator approval. Any alternative vehicle requires your explicit acceptance.</p>
    <JourneyLink className="text-link" href="/fleet">Browse all cars</JourneyLink>
  </div>;
}
