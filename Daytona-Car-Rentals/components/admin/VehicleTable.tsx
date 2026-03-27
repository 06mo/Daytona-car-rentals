"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { getClientServices } from "@/lib/firebase/client";
import { formatCurrency } from "@/lib/utils";
import type { Vehicle } from "@/types";

export function VehicleTable({ vehicles }: { vehicles: Vehicle[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => {
      const haystack = `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.category} ${vehicle.location}`.toLowerCase();
      return !query || haystack.includes(query.toLowerCase());
    });
  }, [query, vehicles]);

  const pageCount = Math.max(1, Math.ceil(filteredVehicles.length / 25));
  const paginatedVehicles = filteredVehicles.slice((page - 1) * 25, page * 25);

  async function handleAvailabilityToggle(vehicle: Vehicle) {
    try {
      setError(null);
      const currentUser = getClientServices()?.auth.currentUser;
      const token = currentUser ? await currentUser.getIdToken() : "";

      if (!token) {
        throw new Error("Sign in is required before editing fleet data.");
      }

      const response = await fetch(`/api/admin/vehicles/${vehicle.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          available: !vehicle.available,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Availability could not be updated.");
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Availability could not be updated.");
    }
  }

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <input
          className="h-11 flex-1 rounded-2xl border border-slate-300 px-4"
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          placeholder="Search make, model, category, or location"
          value={query}
        />
        <Button asChild href="/admin/fleet/new">Add Vehicle</Button>
      </div>

      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

      {paginatedVehicles.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 px-6 py-12 text-center text-slate-500">
          No vehicles match your current search.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="pb-3 font-medium">Vehicle</th>
                <th className="pb-3 font-medium">Category</th>
                <th className="pb-3 font-medium">Daily Rate</th>
                <th className="pb-3 font-medium">Seats</th>
                <th className="pb-3 font-medium">Available</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedVehicles.map((vehicle) => (
                <tr key={vehicle.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-4">
                    <p className="font-medium text-slate-900">{vehicle.year} {vehicle.make} {vehicle.model}</p>
                    <p className="text-slate-500">{vehicle.location}</p>
                  </td>
                  <td className="py-4 capitalize text-slate-600">{vehicle.category}</td>
                  <td className="py-4 text-slate-600">{formatCurrency(vehicle.dailyRate / 100)}</td>
                  <td className="py-4 text-slate-600">{vehicle.seats}</td>
                  <td className="py-4">
                    <button
                      className={`rounded-full px-3 py-2 text-xs font-semibold ${vehicle.available ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                      disabled={isPending}
                      onClick={() => handleAvailabilityToggle(vehicle)}
                      type="button"
                    >
                      {vehicle.available ? "Available" : "Unavailable"}
                    </button>
                  </td>
                  <td className="py-4">
                    <Link className="text-sm font-semibold text-orange-500" href={`/admin/fleet/${vehicle.id}`}>
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between text-sm text-slate-500">
        <span>Page {page} of {pageCount}</span>
        <div className="flex gap-2">
          <Button disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} size="sm" type="button" variant="secondary">
            Previous
          </Button>
          <Button disabled={page === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} size="sm" type="button" variant="secondary">
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
