"use client";
import { useJourney } from "./JourneyProvider";
import type { RentalPeriod } from "@/lib/data/journey";
export function PeriodChips() {
  const { journey, update } = useJourney();
  return <div className="period-chips" role="group" aria-label="Rental length">
    {([["short", "A few days"], ["weekly", "Weekly"], ["monthly", "Monthly"]] as [RentalPeriod, string][]).map(([value, label]) =>
      <button type="button" key={value} aria-pressed={journey.period === value} onClick={() => update({ period: value })}>{label}</button>
    )}
  </div>;
}
