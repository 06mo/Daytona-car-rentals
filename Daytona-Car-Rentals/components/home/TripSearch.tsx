"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
export function TripSearch() {
  const router = useRouter(),
    [location, setLocation] = useState("local"),
    [start, setStart] = useState(""),
    [end, setEnd] = useState("");
  return (
    <form
      className="search-panel"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(
          "/booking?" +
            new URLSearchParams({
              location,
              start: start + "T10:00",
              end: end + "T10:00",
            }),
        );
      }}
    >
      <Select
        id="pickup"
        label="Pickup"
        options={[
          { value: "local", label: "Daytona Beach" },
          { value: "airport", label: "DAB airport delivery" },
        ]}
        value={location}
        onChange={(e) => setLocation(e.target.value)}
      />
      <Input
        id="start"
        label="Pickup date"
        type="date"
        required
        value={start}
        onChange={(e) => setStart(e.target.value)}
      />
      <Input
        id="end"
        label="Return date"
        type="date"
        required
        min={start}
        value={end}
        onChange={(e) => setEnd(e.target.value)}
      />
      <Button size="lg" type="submit">
        Find my car
      </Button>
    </form>
  );
}
