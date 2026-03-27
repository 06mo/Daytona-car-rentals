"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useBooking } from "@/components/providers/BookingProvider";
import { useVehicleOptions } from "@/lib/hooks/useVehicleOptions";
import {
  addDaysToBookingDateTime,
  combineBookingDateAndTime,
  DEFAULT_BOOKING_TIME,
  getAvailableBookingTimes,
  getMinimumBookingDate,
  normalizeBookingDateTimeInput,
  splitBookingDateTime,
  toBookingApiDateTime,
} from "@/lib/utils/bookingDateTime";

export function Step1Dates() {
  const { state, updateDates, updateLocation, setStep } = useBooking();
  const { locations } = useVehicleOptions();
  const [startDate, setStartDate] = useState(normalizeBookingDateTimeInput(state.startDate));
  const [endDate, setEndDate] = useState(normalizeBookingDateTimeInput(state.endDate));
  const [pickupLocation, setPickupLocation] = useState(state.pickupLocation);
  const [returnTouched, setReturnTouched] = useState(Boolean(state.endDate));
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const minimumDate = getMinimumBookingDate();
  const returnLocation = pickupLocation;
  const startParts = splitBookingDateTime(startDate);
  const endParts = splitBookingDateTime(endDate);
  const availableStartTimes = getAvailableBookingTimes(startParts.date);
  const availableEndTimes = getAvailableBookingTimes(endParts.date);

  useEffect(() => {
    if (!startDate || endDate || returnTouched) {
      return;
    }

    setEndDate(addDaysToBookingDateTime(startDate, 1));
  }, [endDate, returnTouched, startDate]);

  useEffect(() => {
    if (!pickupLocation && locations[0]) {
      setPickupLocation(locations[0]);
    }
  }, [locations, pickupLocation]);

  function handleStartDateChange(value: string) {
    const nextTime = startParts.time || DEFAULT_BOOKING_TIME;
    const combined = combineBookingDateAndTime(value, nextTime);
    setStartDate(combined);

    if (!combined) {
      return;
    }

    const suggestedReturn = addDaysToBookingDateTime(combined, 1);

    if (!returnTouched || !endDate || new Date(endDate) <= new Date(combined)) {
      setEndDate(suggestedReturn);
    }
  }

  async function handleContinue() {
    if (!startDate || !endDate || !pickupLocation || !returnLocation) {
      setError("Pick-up date/time, return date/time, and a location are required.");
      return;
    }

    if (new Date(endDate) <= new Date(startDate)) {
      setError("Return date and time must be after pick-up date and time.");
      return;
    }

    setChecking(true);
    setError(null);

    try {
      const response = await fetch("/api/vehicles/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: state.vehicleId,
          startDate: toBookingApiDateTime(startDate),
          endDate: toBookingApiDateTime(endDate),
        }),
      });
      const data = (await response.json()) as { available?: boolean; error?: string };

      if (!response.ok || data.available === false) {
        setError(data.error ?? "This vehicle is not available for the selected dates.");
        return;
      }

      updateDates(startDate, endDate);
      updateLocation(pickupLocation, pickupLocation);
      void fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventName: "booking_dates_completed",
          path: window.location.pathname,
          sessionId: window.sessionStorage.getItem("analytics_session_id") ?? undefined,
          metadata: {
            vehicleId: state.vehicleId,
            pickupLocation,
            returnLocation,
          },
        }),
      }).catch(() => undefined);
      setStep(2);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
          <Input
            label="Pick-up Date"
            min={minimumDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
            type="date"
            value={startParts.date}
          />
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            <span>Pick-up Time</span>
            <select
              className="h-11 rounded-2xl border border-slate-300 bg-white px-4 text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
              onChange={(e) => setStartDate(combineBookingDateAndTime(startParts.date, e.target.value))}
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
            onChange={(e) => {
              setEndDate(combineBookingDateAndTime(e.target.value, endParts.time));
              setReturnTouched(true);
            }}
            type="date"
            value={endParts.date}
          />
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            <span>Return Time</span>
            <select
              className="h-11 rounded-2xl border border-slate-300 bg-white px-4 text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
              onChange={(e) => {
                setEndDate(combineBookingDateAndTime(endParts.date, e.target.value));
                setReturnTouched(true);
              }}
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
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          <span>Pick-up Location</span>
          <select
            className="h-11 rounded-2xl border border-slate-300 px-4"
            onChange={(e) => setPickupLocation(e.target.value)}
            value={pickupLocation}
          >
            <option value="">Select a location</option>
            {locations.map((location) => (
              <option key={location} value={location}>{location}</option>
            ))}
          </select>
        </label>
        <Input
          disabled
          hint="Returns are set to the same location as pickup."
          label="Return Location"
          type="text"
          value={returnLocation || "Will match pickup location"}
        />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button onClick={handleContinue} size="lg" type="button">{checking ? "Checking availability..." : "Continue to Extras"}</Button>
    </div>
  );
}
