import { VehicleOptionsManager } from "@/components/admin/VehicleOptionsManager";

export default function AdminFleetOptionsPage() {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">Admin</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Fleet Options</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Manage shared pick-up locations and reusable feature presets for the fleet form and customer flows.
        </p>
      </div>
      <VehicleOptionsManager />
    </section>
  );
}
