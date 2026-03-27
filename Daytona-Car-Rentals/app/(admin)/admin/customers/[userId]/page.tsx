import { notFound } from "next/navigation";

import { DocumentReviewPanel } from "@/components/admin/DocumentReviewPanel";
import { BookingTable } from "@/components/admin/BookingTable";
import { Badge } from "@/components/ui/Badge";
import { listAdminBookings, listAdminUsers, listAdminVehicles, listUserDocumentsForAdmin } from "@/lib/services/adminService";

type PageProps = {
  params: Promise<{ userId: string }>;
};

export default async function AdminCustomerDetailPage({ params }: PageProps) {
  const { userId } = await params;
  const [users, bookings, vehicles] = await Promise.all([listAdminUsers(), listAdminBookings(), listAdminVehicles()]);
  const customer = users.find((user) => user.id === userId);

  if (!customer) {
    notFound();
  }

  const documents = await listUserDocumentsForAdmin(userId);
  const rows = bookings
    .filter((booking) => booking.userId === userId)
    .map((booking) => ({
      booking,
      customer,
      vehicle: vehicles.find((vehicle) => vehicle.id === booking.vehicleId) ?? null,
    }));

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">Admin</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{customer.displayName}</h1>
      </div>
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Profile</h2>
            <div className="mt-4 grid gap-2 text-sm text-slate-600">
              <p>Email: {customer.email}</p>
              <p>Phone: {customer.phone}</p>
              <p>DOB: {customer.dateOfBirth}</p>
              <p>Stripe Customer: {customer.stripeCustomerId ?? "Not set"}</p>
              <p>Completed bookings: {customer.completedBookingsCount ?? 0}</p>
              <p>Repeat customer: {customer.repeatCustomer ? "Yes" : "No"}</p>
              <p>Fast-track eligible: {customer.fastTrackEligible ? "Yes" : "No"}</p>
              <p>Loyalty discount eligible: {customer.loyaltyDiscountEligible ? "Yes" : "No"}</p>
              {customer.repeatCustomerSince ? <p>Returning since: {customer.repeatCustomerSince.toLocaleDateString()}</p> : null}
              <div className="pt-2">
                <Badge>{customer.verificationStatus}</Badge>
              </div>
            </div>
          </div>
          <DocumentReviewPanel documents={documents} userId={userId} />
        </div>
        <BookingTable bookings={rows} showCancel={false} />
      </div>
    </section>
  );
}
