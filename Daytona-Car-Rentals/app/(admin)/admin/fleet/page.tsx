import { VehicleTable } from "@/components/admin/VehicleTable";
import { listAdminVehicles } from "@/lib/services/adminService";

export default async function AdminFleetPage() {
  const vehicles = await listAdminVehicles();

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">Admin</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Fleet</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">Manage inventory, edit pricing, and control availability from one place.</p>
      </div>
      <VehicleTable vehicles={vehicles} />
    </section>
  );
}
