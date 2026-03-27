import { VehicleForm } from "@/components/admin/VehicleForm";

export default function AdminFleetNewPage() {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">Admin</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Add Vehicle</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">Create a new fleet listing with pricing, features, and bookable image URLs.</p>
      </div>
      <VehicleForm />
    </section>
  );
}
