"use client";
import { useRouter } from "next/navigation";
import { JourneyFields } from "@/components/journey/JourneyFields";
import { useJourney } from "@/components/journey/JourneyProvider";
import { journeyHref } from "@/lib/data/journey";
export function TripSearch() {
  const router = useRouter();
  const { journey, update, validate, setError } = useJourney();
  return <form noValidate onSubmit={event => {
    event.preventDefault();
    if (!event.currentTarget.checkValidity()) {
      setError("Complete valid pickup and return dates, or clear both to browse without dates.");
      return;
    }
    if (validate()) router.push(journeyHref("/fleet", journey));
  }}>
    <JourneyFields hideClear /><div className="date-actions">
    <button className="journey-primary" type="submit">{journey.start || journey.end ? "Browse cars with these dates" : "Browse cars"}</button>{(journey.start || journey.end) && <button type="button" className="text-link" onClick={() => update({start:"",end:""})}>Clear dates</button>}</div>
  </form>;
}
