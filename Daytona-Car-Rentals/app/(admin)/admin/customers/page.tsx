import { CustomerTable } from "@/components/admin/CustomerTable";
import { listAdminBookings, listAdminUsers } from "@/lib/services/adminService";

export default async function AdminCustomersPage() {
  const [customers, bookings] = await Promise.all([listAdminUsers(), listAdminBookings()]);

  const rows = customers
    .filter((customer) => customer.role === "customer")
    .map((customer) => ({
      ...customer,
      totalBookings: bookings.filter((booking) => booking.userId === customer.id).length,
    }));

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">Admin</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Customers</h1>
      </div>
      <CustomerTable customers={rows} />
    </section>
  );
}
