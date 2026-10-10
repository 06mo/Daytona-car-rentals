import { money, type Quote, type TripInput } from "./model";
export const tripKey = (trip: TripInput) =>
  JSON.stringify([
    trip.vehicleId,
    trip.start,
    trip.end,
    trip.location,
    trip.period || "",
  ]);
export const sameTrip = (a: TripInput, b: TripInput) =>
  tripKey(a) === tripKey(b);
export function quoteChanges(previous: Quote | null, next: Quote): string[] {
  if (!previous) return [];
  const changes: string[] = [];
  for (const [field, label] of [
    ["rentalCents", "Rental"],
    ["surchargeCents", "Surcharge"],
    ["deliveryCents", "Pickup service"],
    ["taxCents", "Tax"],
    ["totalCents", "Trip total"],
    ["depositCents", "Separate deposit"],
  ] as const) {
    if (previous[field] !== next[field])
      changes.push(
        `${label}: ${money(previous[field])} → ${money(next[field])}`,
      );
  }
  if (
    JSON.stringify(previous.policy) !== JSON.stringify(next.policy) ||
    previous.mileage !== next.mileage ||
    previous.minimumAge !== next.minimumAge ||
    previous.agreementVersion !== next.agreementVersion
  )
    changes.push(
      "Rental requirements changed. Review the current terms and document requirements below.",
    );
  return changes;
}
