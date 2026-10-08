"use client";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useJourney } from "./JourneyProvider";
import { monthlyTerms, type RentalPeriod } from "@/lib/data/journey";
export function JourneyFields({ compact = false, hideClear = false }: { compact?: boolean; hideClear?: boolean }) {
  const { journey, update } = useJourney();
  const dates = <>
    <Input id="journey-start" label="Pickup (optional)" type="datetime-local" value={journey.start} onChange={e => update({ start: e.target.value })} />
    <Input id="journey-end" label="Return (optional)" type="datetime-local" min={journey.start} value={journey.end} onChange={e => update({ end: e.target.value })} />
    <p className="small-note">All times are Eastern. Browsing does not check availability.</p>
    {!hideClear && (journey.start || journey.end) && <button type="button" className="text-link clear-dates" onClick={() => update({ start: "", end: "" })}>Clear dates</button>}
  </>;
  return <div className={`journey-fields ${compact ? "journey-compact" : ""}`}>
    <Select id="rental-period" label="Rental period" value={journey.period} onChange={e => update({ period: e.target.value as RentalPeriod })} options={[
      { value: "", label: "Not sure yet" }, { value: "short", label: "A few days" }, { value: "weekly", label: "Weekly" }, { value: "monthly", label: "Monthly" },
    ]} />
    {compact ? <details className="optional-dates"><summary>Add dates{journey.start || journey.end ? " · Dates entered" : " (optional)"}</summary><div className="optional-date-fields">{dates}</div></details> : dates}
    {journey.period === "monthly" && <p className="small-note">{monthlyTerms}</p>}
  </div>;
}
