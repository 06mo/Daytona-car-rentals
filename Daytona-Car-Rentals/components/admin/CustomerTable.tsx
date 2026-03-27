"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import type { UserProfile } from "@/types";

export function CustomerTable({ customers }: { customers: Array<UserProfile & { totalBookings: number }> }) {
  const [filter, setFilter] = useState("all");

  const filteredCustomers = useMemo(
    () => customers.filter((customer) => filter === "all" || customer.verificationStatus === filter),
    [customers, filter],
  );

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Customers</h2>
        <select className="h-11 rounded-2xl border border-slate-300 px-4" onChange={(e) => setFilter(e.target.value)} value={filter}>
          <option value="all">All</option>
          <option value="unverified">Unverified</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {filteredCustomers.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 px-6 py-12 text-center text-slate-500">
          No customers match this filter.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="pb-3 font-medium">Name</th>
                <th className="pb-3 font-medium">Email</th>
                <th className="pb-3 font-medium">Verification</th>
                <th className="pb-3 font-medium">Repeat Status</th>
                <th className="pb-3 font-medium">Bookings</th>
                <th className="pb-3 font-medium">Joined</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-4 font-medium text-slate-900">{customer.displayName}</td>
                  <td className="py-4 text-slate-600">{customer.email}</td>
                  <td className="py-4"><Badge>{customer.verificationStatus}</Badge></td>
                  <td className="py-4">
                    {customer.repeatCustomer ? (
                      <Badge className="bg-emerald-50 text-emerald-700">
                        {customer.fastTrackEligible ? "Fast-track" : "Returning"}
                      </Badge>
                    ) : (
                      <span className="text-slate-500">New</span>
                    )}
                  </td>
                  <td className="py-4 text-slate-600">{customer.totalBookings}</td>
                  <td className="py-4 text-slate-600">{customer.createdAt.toLocaleDateString()}</td>
                  <td className="py-4">
                    <Link className="text-sm font-semibold text-orange-500" href={`/admin/customers/${customer.id}`}>View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
