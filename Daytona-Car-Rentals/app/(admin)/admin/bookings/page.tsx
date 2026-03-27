import { BookingTable } from "@/components/admin/BookingTable";
import { listAdminBookings, listAdminUsers, listAdminVehicles } from "@/lib/services/adminService";

export default async function AdminBookingsPage() {
  const [bookings, users, vehicles] = await Promise.all([
    listAdminBookings(),
    listAdminUsers(),
    listAdminVehicles(),
  ]);

  const rows = bookings.map((booking) => ({
    booking,
    customer: users.find((user) => user.id === booking.userId) ?? null,
    vehicle: vehicles.find((vehicle) => vehicle.id === booking.vehicleId) ?? null,
  }));

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">Admin</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Bookings</h1>
      </div>
      <BookingTable bookings={rows} />
    </section>
  );
}
