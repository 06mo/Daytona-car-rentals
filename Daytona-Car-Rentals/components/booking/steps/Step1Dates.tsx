"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useBooking } from "@/components/providers/BookingProvider";
import { useVehicleOptions } from "@/lib/hooks/useVehicleOptions";
import {
  addDaysToBookingDateTime,
  getMinimumBookingDateTime,
  normalizeBookingDateTimeInput,
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
  const minimumDateTime = getMinimumBookingDateTime();
  const returnLocation = pickupLocation;

  useEffect(() => {
    if (!startDate || endDate || returnTouched) {
      return;
    }

    setEndDate(addDaysToBookingDateTime(startDate, 1));
  }, [endDate, returnTouched, startDate]);

  function handleStartDateChange(value: string) {
    setStartDate(value);

    if (!value) {
      return;
    }

    const suggestedReturn = addDaysToBookingDateTime(value, 1);

    if (!returnTouched || !endDate || new Date(endDate) <= new Date(value)) {
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
        <Input
          label="Pick-up Date & Time"
          min={minimumDateTime}
          onChange={(e) => handleStartDateChange(e.target.value)}
          type="datetime-local"
          value={startDate}
        />
        <Input
          label="Return Date & Time"
          min={startDate || minimumDateTime}
          onChange={(e) => {
            setEndDate(e.target.value);
            setReturnTouched(true);
          }}
          type="datetime-local"
          value={endDate}
        />
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
