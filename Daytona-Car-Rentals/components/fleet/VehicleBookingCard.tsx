"use client";

import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useVehicleOptions } from "@/lib/hooks/useVehicleOptions";
import {
  addDaysToBookingDateTime,
  combineBookingDateAndTime,
  DEFAULT_BOOKING_TIME,
  getAvailableBookingTimes,
  getMinimumBookingDate,
  splitBookingDateTime,
} from "@/lib/utils/bookingDateTime";
import { formatCurrency } from "@/lib/utils";
import { getDateRangeInDays } from "@/lib/utils/dateUtils";
import type { Vehicle } from "@/types";

type VehicleBookingCardProps = {
  initialEndDate?: string;
  initialLocation?: string;
  initialStartDate?: string;
  vehicle: Vehicle;
};

const trustSignals = [
  "Free cancellation within 24h",
  "No hidden fees",
  "Secure payment via Stripe",
];

export function VehicleBookingCard({
  vehicle,
  initialStartDate,
  initialEndDate,
  initialLocation,
}: VehicleBookingCardProps) {
  const router = useRouter();
  const { locations } = useVehicleOptions();
  const [startDate, setStartDate] = useState(initialStartDate ?? "");
  const [endDate, setEndDate] = useState(initialEndDate ?? "");
  const [location, setLocation] = useState(initialLocation ?? "");
  const [error, setError] = useState<string | null>(null);
  const minimumDate = getMinimumBookingDate();
  const startParts = splitBookingDateTime(startDate);
  const endParts = splitBookingDateTime(endDate);
  const availableStartTimes = getAvailableBookingTimes(startParts.date);
  const availableEndTimes = getAvailableBookingTimes(endParts.date);

  const hasValidDates = startDate && endDate && new Date(endDate) > new Date(startDate);
  const totalDays = hasValidDates ? getDateRangeInDays(new Date(startDate), new Date(endDate)) : 0;
  const baseTotal = totalDays > 0 ? vehicle.dailyRate * totalDays : 0;

  useEffect(() => {
    if (!location && locations[0]) {
      setLocation(locations[0]);
    }
  }, [location, locations]);

  function handleStartDateChange(value: string) {
    const combined = combineBookingDateAndTime(value, startParts.time || DEFAULT_BOOKING_TIME);
    setStartDate(combined);

    if (!combined) {
      return;
    }

    if (!endDate || new Date(endDate) <= new Date(combined)) {
      setEndDate(addDaysToBookingDateTime(combined, 1));
    }
  }

  function handleBookNow() {
    if (!startDate || !endDate) {
      setError("Select both your pick-up and return dates.");
      return;
    }

    if (new Date(endDate) <= new Date(startDate)) {
      setError("Return date must be after pick-up date.");
      return;
    }

    if (!location) {
      setError("Choose a pick-up location before continuing.");
      return;
    }

    setError(null);
    const params = new URLSearchParams({
      start: startDate,
      end: endDate,
      location,
    });

    router.push(`/booking/${vehicle.id}?${params.toString()}`);
  }

  return (
    <aside className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl lg:sticky lg:top-24">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">{vehicle.category}</p>
        <h2 className="text-2xl font-semibold text-slate-900">
          {vehicle.year} {vehicle.make} {vehicle.model}
        </h2>
        <p className="text-3xl font-bold text-orange-500">
          {formatCurrency(vehicle.dailyRate / 100)}
          <span className="ml-1 text-base font-medium text-slate-500">/ day</span>
        </p>
      </div>

      <div className="mt-6 grid gap-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
          <Input
            label="Pick-up Date"
            min={minimumDate}
            onChange={(event) => handleStartDateChange(event.target.value)}
            type="date"
            value={startParts.date}
          />
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            <span>Pick-up Time</span>
            <select
              className="h-11 rounded-2xl border border-slate-300 bg-white px-4 text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
              onChange={(event) => setStartDate(combineBookingDateAndTime(startParts.date, event.target.value))}
              value={availableStartTimes.includes(startParts.time) ? startParts.time : availableStartTimes[0] ?? DEFAULT_BOOKING_TIME}
            >
              {availableStartTimes.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
          <Input
            label="Return Date"
            min={startParts.date || minimumDate}
            onChange={(event) => setEndDate(combineBookingDateAndTime(event.target.value, endParts.time))}
            type="date"
            value={endParts.date}
          />
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            <span>Return Time</span>
            <select
              className="h-11 rounded-2xl border border-slate-300 bg-white px-4 text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
              onChange={(event) => setEndDate(combineBookingDateAndTime(endParts.date, event.target.value))}
              value={availableEndTimes.includes(endParts.time) ? endParts.time : availableEndTimes[0] ?? DEFAULT_BOOKING_TIME}
            >
              {availableEndTimes.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          <span>Location</span>
          <select
            className="h-11 rounded-2xl border border-slate-300 bg-white px-4 text-slate-900 outline-none focus:border-orange-400"
            onChange={(event) => setLocation(event.target.value)}
            value={location}
          >
            <option value="">Select a location</option>
            {locations.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      {totalDays > 0 ? (
        <div className="mt-6 rounded-3xl bg-slate-50 p-5">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>
              {totalDays} day{totalDays > 1 ? "s" : ""} × {formatCurrency(vehicle.dailyRate / 100)}
            </span>
            <span>{formatCurrency(baseTotal / 100)}</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 text-sm font-semibold text-slate-900">
            <span>Deposit due today</span>
            <span>{formatCurrency(vehicle.depositAmount / 100)}</span>
          </div>
        </div>
      ) : null}

      <Button className="mt-6 w-full" onClick={handleBookNow} size="lg" type="button">
        Book Now
      </Button>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="mt-6 grid gap-3">
        {trustSignals.map((item) => (
          <div key={item} className="flex items-center gap-3 text-sm text-slate-600">
            <CheckCircle2 className="h-4 w-4 text-orange-500" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
