import { notFound } from "next/navigation";

import { ChecklistForm } from "@/components/admin/ChecklistForm";
import { getChecklist } from "@/lib/services/checklistService";
import { getBookingById } from "@/lib/services/bookingService";
import { getVehicleById } from "@/lib/services/vehicleService";
import type { ChecklistType } from "@/types";

type PageProps = {
  params: Promise<{ bookingId: string; type: ChecklistType }>;
};

export default async function AdminChecklistPage({ params }: PageProps) {
  const { bookingId, type } = await params;
  const booking = await getBookingById(bookingId);

  if (!booking || !["pickup", "dropoff"].includes(type)) {
    notFound();
  }

  const [vehicle, checklist] = await Promise.all([
    getVehicleById(booking.vehicleId),
    getChecklist(bookingId, type),
  ]);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">Admin</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
          {type === "pickup" ? "Pickup Checklist" : "Dropoff Checklist"}
        </h1>
      </div>
      <ChecklistForm
        bookingId={bookingId}
        checklist={checklist}
        type={type}
        vehicleLabel={vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : booking.vehicleId}
      />
    </section>
  );
}
