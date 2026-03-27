"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { daytonaLocations } from "@/lib/data/locations";

export function HeroSection() {
  const router = useRouter();
  const [location, setLocation] = useState(daytonaLocations[0]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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
              <Input
                hint="Choose a pickup point in or around Daytona Beach"
                label="Pick-up Location"
                list="daytona-locations"
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Daytona Beach Airport"
                value={location}
              />
              <datalist id="daytona-locations">
                {daytonaLocations.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
            <Input
              label="Pick-up Date"
              min={new Date().toISOString().split("T")[0]}
              onChange={(event) => setStartDate(event.target.value)}
              type="date"
              value={startDate}
            />
            <Input
              label="Return Date"
              min={startDate || new Date().toISOString().split("T")[0]}
              onChange={(event) => setEndDate(event.target.value)}
              type="date"
              value={endDate}
            />
            <Button className="w-full md:w-auto" onClick={handleSearch} size="lg" type="button">
              Search Available Cars
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
