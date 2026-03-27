"use client";

import { SlidersHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useVehicleOptions } from "@/lib/hooks/useVehicleOptions";
import {
  addDaysToBookingDateTime,
  combineBookingDateAndTime,
  DEFAULT_BOOKING_TIME,
  getAvailableBookingTimes,
  getMinimumBookingDate,
  splitBookingDateTime,
} from "@/lib/utils/bookingDateTime";
import { cn } from "@/lib/utils";
import type { FleetFilters, TransmissionType, VehicleCategory } from "@/types";

const categories: VehicleCategory[] = ["economy", "suv", "luxury", "van", "truck", "convertible"];
const seatOptions = [2, 4, 5, 7];

type VehicleFiltersProps = {
  initialFilters: FleetFilters;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onFiltersChange: (filters: FleetFilters) => void;
  onOpenMobile: () => void;
};

function countActiveFilters(filters: FleetFilters) {
  return [
    filters.categories.length > 0,
    filters.minPrice > 25 || filters.maxPrice < 500,
    filters.minSeats > 0,
    Boolean(filters.transmission),
    Boolean(filters.startDate && filters.endDate),
    Boolean(filters.location),
  ].filter(Boolean).length;
}

function FilterPanel({
  filters,
  onFiltersChange,
}: {
  filters: FleetFilters;
  onFiltersChange: (filters: FleetFilters) => void;
}) {
  const { locations } = useVehicleOptions();
  const minimumDate = getMinimumBookingDate();
  const startParts = splitBookingDateTime(filters.startDate ?? "");
  const endParts = splitBookingDateTime(filters.endDate ?? "");
  const availableStartTimes = getAvailableBookingTimes(startParts.date);
  const availableEndTimes = getAvailableBookingTimes(endParts.date);

  function toggleCategory(category: VehicleCategory) {
    const categories = filters.categories.includes(category)
      ? filters.categories.filter((item) => item !== category)
      : [...filters.categories, category];

    onFiltersChange({ ...filters, categories });
  }

  function updateTransmission(transmission: TransmissionType | null) {
    onFiltersChange({ ...filters, transmission });
  }

  function clearFilters() {
    onFiltersChange({
      categories: [],
      minPrice: 25,
      maxPrice: 500,
      minSeats: 0,
      transmission: null,
      startDate: null,
      endDate: null,
      location: null,
    });
  }

  return (
    <div className="space-y-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Dates</h3>
        <div className="grid gap-4">
          <Input
            label="Pick-up"
            min={minimumDate}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                startDate: combineBookingDateAndTime(event.target.value, startParts.time || DEFAULT_BOOKING_TIME) || null,
                endDate:
                  !filters.endDate || (event.target.value && new Date(filters.endDate) <= new Date(combineBookingDateAndTime(event.target.value, startParts.time || DEFAULT_BOOKING_TIME)))
                    ? addDaysToBookingDateTime(combineBookingDateAndTime(event.target.value, startParts.time || DEFAULT_BOOKING_TIME), 1) || null
                    : filters.endDate,
              })
            }
            type="date"
            value={startParts.date}
          />
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            <span>Pick-up Time</span>
            <select
              className="h-11 rounded-2xl border border-slate-300 bg-white px-4 text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
              onChange={(event) => onFiltersChange({ ...filters, startDate: combineBookingDateAndTime(startParts.date, event.target.value) || null })}
              value={availableStartTimes.includes(startParts.time) ? startParts.time : availableStartTimes[0] ?? DEFAULT_BOOKING_TIME}
            >
              {availableStartTimes.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </label>
          <Input
            label="Return"
            min={startParts.date || minimumDate}
            onChange={(event) => onFiltersChange({ ...filters, endDate: combineBookingDateAndTime(event.target.value, endParts.time) || null })}
            type="date"
            value={endParts.date}
          />
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            <span>Return Time</span>
            <select
              className="h-11 rounded-2xl border border-slate-300 bg-white px-4 text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
              onChange={(event) => onFiltersChange({ ...filters, endDate: combineBookingDateAndTime(endParts.date, event.target.value) || null })}
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

      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Location</h3>
        <select
          className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-slate-900 outline-none focus:border-orange-400"
          onChange={(event) => onFiltersChange({ ...filters, location: event.target.value || null })}
          value={filters.location ?? ""}
        >
          <option value="">All locations</option>
          {locations.map((location) => (
            <option key={location} value={location}>
              {location}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Category</h3>
        <div className="grid gap-3">
          {categories.map((category) => (
            <label key={category} className="flex items-center gap-3 text-sm text-slate-700">
              <input
                checked={filters.categories.includes(category)}
                className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                onChange={() => toggleCategory(category)}
                type="checkbox"
              />
              <span className="capitalize">{category}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Price / Day</h3>
          <Badge className="bg-orange-50 text-orange-600">
            ${filters.minPrice} - ${filters.maxPrice}
          </Badge>
        </div>
        <div className="grid gap-4">
          <label className="text-sm text-slate-600">
            Minimum
            <input
              className="mt-2 w-full accent-orange-500"
              max={filters.maxPrice}
              min={25}
              onChange={(event) =>
                onFiltersChange({ ...filters, minPrice: Number(event.target.value) })
              }
              type="range"
              value={filters.minPrice}
            />
          </label>
          <label className="text-sm text-slate-600">
            Maximum
            <input
              className="mt-2 w-full accent-orange-500"
              max={500}
              min={filters.minPrice}
              onChange={(event) =>
                onFiltersChange({ ...filters, maxPrice: Number(event.target.value) })
              }
              type="range"
              value={filters.maxPrice}
            />
          </label>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Seats</h3>
        <div className="flex flex-wrap gap-2">
          {seatOptions.map((value) => (
            <button
              key={value}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium",
                filters.minSeats === value
                  ? "border-orange-500 bg-orange-50 text-orange-600"
                  : "border-slate-300 text-slate-600",
              )}
              onClick={() => onFiltersChange({ ...filters, minSeats: filters.minSeats === value ? 0 : value })}
              type="button"
            >
              {value}+
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Transmission</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "All", value: null },
            { label: "Automatic", value: "automatic" as const },
            { label: "Manual", value: "manual" as const },
          ].map((option) => (
            <button
              key={option.label}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium",
                filters.transmission === option.value
                  ? "border-orange-500 bg-orange-50 text-orange-600"
                  : "border-slate-300 text-slate-600",
              )}
              onClick={() => updateTransmission(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <Button className="w-full" onClick={clearFilters} variant="secondary">
        Clear Filters
      </Button>
    </div>
  );
}

export function VehicleFilters({
  initialFilters,
  isMobileOpen,
  onCloseMobile,
  onFiltersChange,
  onOpenMobile,
}: VehicleFiltersProps) {
  const activeFilters = countActiveFilters(initialFilters);

  return (
    <>
      <div className="lg:hidden">
        <Button className="w-full justify-center gap-2" onClick={onOpenMobile} variant="secondary">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFilters > 0 ? <Badge className="bg-orange-50 text-orange-600">{activeFilters}</Badge> : null}
        </Button>
      </div>

      <div className="hidden lg:block lg:sticky lg:top-24">
        <FilterPanel filters={initialFilters} onFiltersChange={onFiltersChange} />
      </div>

      <Modal
        className="max-w-2xl"
        onClose={onCloseMobile}
        open={isMobileOpen}
        title="Filters"
      >
        <FilterPanel filters={initialFilters} onFiltersChange={onFiltersChange} />
      </Modal>
    </>
  );
}
