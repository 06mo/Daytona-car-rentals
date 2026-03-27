import { VehicleCard, VehicleCardSkeleton } from "@/components/fleet/VehicleCard";
import type { Vehicle, VehicleSort } from "@/types";

type VehicleGridProps = {
  endDate?: string | null;
  loading: boolean;
  onClearFilters: () => void;
  onSortChange: (value: VehicleSort) => void;
  sortBy: VehicleSort;
  startDate?: string | null;
  vehicles: Vehicle[];
};

export function VehicleGrid({
  vehicles,
  loading,
  sortBy,
  onSortChange,
  onClearFilters,
  startDate,
  endDate,
}: VehicleGridProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">{vehicles.length} vehicles available</p>
        <select
          className="h-11 rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-700 outline-none focus:border-orange-400"
          onChange={(event) => onSortChange(event.target.value as VehicleSort)}
          value={sortBy}
        >
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="newest">Newest</option>
        </select>
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <VehicleCardSkeleton key={index} />
          ))}
        </div>
      ) : vehicles.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-8 py-16 text-center">
          <h3 className="text-2xl font-semibold text-slate-900">No vehicles match your filters.</h3>
          <p className="mt-3 text-slate-500">Try widening your date range, resetting price, or clearing the category filters.</p>
          <button className="mt-6 text-sm font-semibold text-orange-500" onClick={onClearFilters} type="button">
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {vehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              endDate={endDate ?? undefined}
              startDate={startDate ?? undefined}
              vehicle={vehicle}
            />
          ))}
        </div>
      )}
    </div>
  );
}
