import { redirect } from "next/navigation";

import { ChecklistView } from "@/components/admin/ChecklistView";
import { getServerUserId } from "@/lib/auth/getServerUserId";
import { getChecklist } from "@/lib/services/checklistService";
import { getBookingById } from "@/lib/services/bookingService";
import { getVehicleById } from "@/lib/services/vehicleService";
import type { ChecklistType } from "@/types";

type PageProps = {
  params: Promise<{ bookingId: string; type: ChecklistType }>;
};

export default async function CustomerChecklistPage({ params }: PageProps) {
  const userId = await getServerUserId();

  if (!userId) {
    redirect("/login?returnUrl=%2Fdashboard%2Fbookings");
  }

  const { bookingId, type } = await params;
  const booking = await getBookingById(bookingId);

  if (!booking || booking.userId !== userId) {
    redirect("/dashboard/bookings");
  }

  const [vehicle, checklist] = await Promise.all([
    getVehicleById(booking.vehicleId),
    getChecklist(bookingId, type),
  ]);

  if (!checklist || checklist.status !== "submitted") {
    redirect(`/dashboard/bookings/${bookingId}`);
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">Portal</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
          {type === "pickup" ? "Pickup Checklist" : "Dropoff Checklist"}
        </h1>
        <p className="mt-2 text-slate-600">{vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : booking.vehicleId}</p>
      </div>
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <ChecklistView checklist={checklist} />
      </div>
    </section>
  );
}
