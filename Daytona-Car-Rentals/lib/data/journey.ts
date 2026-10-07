import { daytonaTime } from "../pilot/model";
export type RentalPeriod = "" | "short" | "weekly" | "monthly";
export type Journey = { vehicle: string; period: RentalPeriod; start: string; end: string; location: string };
export const emptyJourney: Journey = { vehicle: "", period: "", start: "", end: "", location: "local" };
export function readJourney(params: URLSearchParams): Partial<Journey> {
  const result: Partial<Journey> = {};
  for (const key of ["vehicle", "start", "end", "location"] as const) {
    if (params.has(key)) result[key] = params.get(key)!.slice(0, 80);
  }
  const period = params.get("period");
  if (period !== null) result.period = ["short", "weekly", "monthly"].includes(period) ? period as RentalPeriod : "";
  return result;
}
export function journeyHref(href: string, journey: Journey, changes: Partial<Journey> = {}) {
  const url = new URL(href, "http://local");
  for (const [key, value] of Object.entries({ ...journey, ...changes })) {
    if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
  }
  return url.pathname + url.search + url.hash;
}
export const monthlyTerms = "Monthly rentals are arranged in terms of up to 30 days, with renewal subject to approval and availability.";

// Browsing is optional-date planning, never an availability check.
export function validateJourneyDates(start: string, end: string): string {
  if (!start && !end) return "";
  if (!start || !end) return "Enter both pickup and return dates, or clear both to browse without dates.";
  try {
    const pickup = daytonaTime(start), dropoff = daytonaTime(end);
    if (dropoff <= pickup) return "Return must be after pickup.";
    if (pickup <= Date.now()) return "Choose a future pickup date, or clear dates to browse.";
    if (Math.ceil((Date.parse(end + "Z") - Date.parse(start + "Z")) / 86400000) > 30)
      return "Choose a term of up to 30 days. Renewal is subject to approval and availability.";
  } catch {
    return "Enter valid Eastern dates and times. Avoid missing or repeated times during a clock change.";
  }
  return "";
}
