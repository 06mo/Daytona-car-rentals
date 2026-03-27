"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useVehicleOptions } from "@/lib/hooks/useVehicleOptions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  addDaysToBookingDateTime,
  combineBookingDateAndTime,
  DEFAULT_BOOKING_TIME,
  getAvailableBookingTimes,
  getMinimumBookingDate,
  splitBookingDateTime,
} from "@/lib/utils/bookingDateTime";

export function HeroSection() {
  const router = useRouter();
  const { locations } = useVehicleOptions();
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const minimumDate = getMinimumBookingDate();
  const startParts = splitBookingDateTime(startDate);
  const endParts = splitBookingDateTime(endDate);
  const availableStartTimes = getAvailableBookingTimes(startParts.date);
  const availableEndTimes = getAvailableBookingTimes(endParts.date);

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

  function handleSearch() {
    const params = new URLSearchParams();

    if (location) {
      params.set("location", location);
    }

    if (startDate) {
      params.set("start", startDate);
    }

    if (endDate) {
      params.set("end", endDate);
    }

    router.push(`/fleet?${params.toString()}`);
  }

  return (
    <section className="relative isolate overflow-hidden">
      <div className="absolute inset-0">
        <Image
          alt="Stylized Daytona coastal highway background"
          className="object-cover"
          fill
          priority
          src="/images/hero-road.svg"
        />
        <div className="absolute inset-0 bg-slate-950/65" />
      </div>

      <div className="relative mx-auto flex min-h-[660px] max-w-6xl flex-col items-center justify-center px-6 py-24 text-center">
        <div className="max-w-3xl space-y-5">
          <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-orange-200">
            Daytona-based. Fully insured. Ready when you are.
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Premium Cars. Simple Rentals.
          </h1>
          <p className="text-lg text-slate-200">
            Explore Daytona in style with a local fleet built for beach weekends, race days, and business trips.
          </p>
        </div>

        <div className="mt-10 w-full max-w-4xl rounded-3xl bg-white p-6 shadow-2xl">
          <div className="grid gap-4 md:grid-cols-[1.2fr_1fr_1fr_auto] md:items-end">
            <div>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                <span>Pick-up Location</span>
                <select
                  className="h-11 rounded-2xl border border-slate-300 bg-white px-4 text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
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
                <span className="text-sm text-slate-500">Choose a pickup point in or around Daytona Beach.</span>
              </label>
            </div>
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
            <div className="grid gap-4 md:grid-cols-[1fr_160px] md:col-span-2">
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
            <Button className="w-full md:w-auto" onClick={handleSearch} size="lg" type="button">
              Search Available Cars
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
