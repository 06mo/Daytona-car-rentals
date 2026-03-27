import { notFound } from "next/navigation";

import { VehicleForm } from "@/components/admin/VehicleForm";
import { getVehicleById } from "@/lib/services/vehicleService";

type PageProps = {
  params: Promise<{ vehicleId: string }>;
};

export default async function AdminFleetEditPage({ params }: PageProps) {
  const { vehicleId } = await params;
  const vehicle = await getVehicleById(vehicleId);

  if (!vehicle) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">Admin</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Edit Vehicle</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">Update rates, availability, images, and listing details for this vehicle.</p>
      </div>
      <VehicleForm vehicle={vehicle} />
    </section>
  );
}
