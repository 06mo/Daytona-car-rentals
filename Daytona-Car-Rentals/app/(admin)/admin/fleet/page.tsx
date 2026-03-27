import { listAdminVehicles } from "@/lib/services/adminService";
import { formatCurrency } from "@/lib/utils";

export default async function AdminFleetPage() {
  const vehicles = await listAdminVehicles();

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">Admin</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Fleet</h1>
      </div>
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="pb-3 font-medium">Vehicle</th>
                <th className="pb-3 font-medium">Category</th>
                <th className="pb-3 font-medium">Daily Rate</th>
                <th className="pb-3 font-medium">Seats</th>
                <th className="pb-3 font-medium">Available</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((vehicle) => (
                <tr key={vehicle.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-4 font-medium text-slate-900">{vehicle.year} {vehicle.make} {vehicle.model}</td>
                  <td className="py-4 capitalize text-slate-600">{vehicle.category}</td>
                  <td className="py-4 text-slate-600">{formatCurrency(vehicle.dailyRate / 100)}</td>
                  <td className="py-4 text-slate-600">{vehicle.seats}</td>
                  <td className="py-4 text-slate-600">{vehicle.available ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
