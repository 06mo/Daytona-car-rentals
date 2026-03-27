"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useBooking } from "@/components/providers/BookingProvider";
import { useVehicleOptions } from "@/lib/hooks/useVehicleOptions";

export function Step1Dates() {
  const { state, updateDates, updateLocation, setStep } = useBooking();
  const { locations } = useVehicleOptions();
  const [startDate, setStartDate] = useState(state.startDate);
  const [endDate, setEndDate] = useState(state.endDate);
  const [pickupLocation, setPickupLocation] = useState(state.pickupLocation);
  const [returnLocation, setReturnLocation] = useState(state.returnLocation || state.pickupLocation);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function handleContinue() {
    if (!startDate || !endDate || !pickupLocation || !returnLocation) {
      setError("Pick-up date, return date, and both locations are required.");
      return;
    }

    if (new Date(endDate) <= new Date(startDate)) {
      setError("Return date must be after pick-up date.");
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
          startDate,
          endDate,
        }),
      });
      const data = (await response.json()) as { available?: boolean; error?: string };

      if (!response.ok || data.available === false) {
        setError(data.error ?? "This vehicle is not available for the selected dates.");
        return;
      }

      updateDates(startDate, endDate);
      updateLocation(pickupLocation, returnLocation);
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
        <Input label="Pick-up Date" min={new Date().toISOString().split("T")[0]} onChange={(e) => setStartDate(e.target.value)} type="date" value={startDate} />
        <Input label="Return Date" min={startDate || new Date().toISOString().split("T")[0]} onChange={(e) => setEndDate(e.target.value)} type="date" value={endDate} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          <span>Pick-up Location</span>
          <select className="h-11 rounded-2xl border border-slate-300 px-4" onChange={(e) => setPickupLocation(e.target.value)} value={pickupLocation}>
            <option value="">Select a location</option>
            {locations.map((location) => (
              <option key={location} value={location}>{location}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          <span>Return Location</span>
          <select className="h-11 rounded-2xl border border-slate-300 px-4" onChange={(e) => setReturnLocation(e.target.value)} value={returnLocation}>
            <option value="">Select a location</option>
            {locations.map((location) => (
              <option key={location} value={location}>{location}</option>
            ))}
          </select>
        </label>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button onClick={handleContinue} size="lg" type="button">{checking ? "Checking availability..." : "Continue to Extras"}</Button>
    </div>
  );
}
