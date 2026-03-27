"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ProtectionPackageBadge } from "@/components/booking/ProtectionPackageBadge";
import { BookingStatusBadge } from "@/components/admin/BookingStatusBadge";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import type { Booking, UserProfile, Vehicle } from "@/types";

type BookingRow = {
  booking: Booking;
  customer: UserProfile | null;
  vehicle: Vehicle | null;
};

export function BookingTable({
  bookings,
  showCancel = true,
}: {
  bookings: BookingRow[];
  showCancel?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const filteredBookings = useMemo(() => {
    return bookings.filter(({ booking, customer, vehicle }) => {
      const matchesQuery =
        !query ||
        booking.id.toLowerCase().includes(query.toLowerCase()) ||
        customer?.displayName.toLowerCase().includes(query.toLowerCase()) ||
        vehicle?.model.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = status === "all" || booking.status === status;

      return matchesQuery && matchesStatus;
    });
  }, [bookings, query, status]);

  const paginatedBookings = filteredBookings.slice((page - 1) * 25, page * 25);
  const pageCount = Math.max(1, Math.ceil(filteredBookings.length / 25));

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row">
        <input
          className="h-11 flex-1 rounded-2xl border border-slate-300 px-4"
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          placeholder="Search customer, booking ID, or vehicle"
          value={query}
        />
        <select
          className="h-11 rounded-2xl border border-slate-300 px-4"
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          value={status}
        >
          <option value="all">All statuses</option>
          <option value="pending_verification">Pending Verification</option>
          <option value="pending_payment">Pending Payment</option>
          <option value="payment_authorized">Payment Authorized</option>
          <option value="insurance_pending">Insurance Pending</option>
          <option value="insurance_manual_review">Insurance Manual Review</option>
          <option value="insurance_cleared">Insurance Cleared</option>
          <option value="confirmed">Confirmed</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="payment_failed">Payment Failed</option>
        </select>
      </div>

      {paginatedBookings.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 px-6 py-12 text-center text-slate-500">
          No bookings match your current filters.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="pb-3 font-medium">Booking ID</th>
                <th className="pb-3 font-medium">Customer</th>
                <th className="pb-3 font-medium">Vehicle</th>
                <th className="pb-3 font-medium">Dates</th>
                <th className="pb-3 font-medium">Protection</th>
                <th className="pb-3 font-medium">Total</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedBookings.map(({ booking, customer, vehicle }) => (
                <tr key={booking.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-4 font-mono text-xs text-slate-700">{booking.id.slice(0, 8)}</td>
                  <td className="py-4">
                    <p className="font-medium text-slate-900">{customer?.displayName ?? booking.userId}</p>
                    <p className="text-slate-500">{customer?.email ?? "No email"}</p>
                  </td>
                  <td className="py-4 text-slate-700">{vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : booking.vehicleId}</td>
                  <td className="py-4 text-slate-700">{booking.startDate.toLocaleDateString()} - {booking.endDate.toLocaleDateString()}</td>
                  <td className="py-4"><ProtectionPackageBadge packageId={booking.protectionPackage} /></td>
                  <td className="py-4 text-slate-700">{formatCurrency(booking.pricing.totalAmount / 100)}</td>
                  <td className="py-4"><BookingStatusBadge status={booking.status} /></td>
                  <td className="py-4">
                    <div className="flex gap-2">
                      <Button asChild size="sm" variant="secondary" href={`/admin/bookings/${booking.id}`}>
                        View
                      </Button>
                      {showCancel && booking.status !== "completed" && booking.status !== "cancelled" ? (
                        <Link className="inline-flex items-center rounded-full px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50" href={`/admin/bookings/${booking.id}`}>
                          Cancel
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between text-sm text-slate-500">
        <span>Page {page} of {pageCount}</span>
        <div className="flex gap-2">
          <Button disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} size="sm" type="button" variant="secondary">
            Previous
          </Button>
          <Button disabled={page === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} size="sm" type="button" variant="secondary">
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
