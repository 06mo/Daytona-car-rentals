import { CarFront, CalendarDays, Clock3, DollarSign } from "lucide-react";

import { AnalyticsOverview } from "@/components/admin/AnalyticsOverview";
import { BookingTable } from "@/components/admin/BookingTable";
import { RevenueChart } from "@/components/admin/RevenueChart";
import { StatsCard } from "@/components/admin/StatsCard";
import { getAdminDashboardData } from "@/lib/services/adminService";
import { formatCurrency } from "@/lib/utils";

export default async function AdminDashboardPage() {
  const { analytics, stats, bookingsWithContext, revenueSeries } = await getAdminDashboardData();

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">Admin</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard icon={CalendarDays} title="Total Bookings (This Month)" value={stats.totalBookings} />
        <StatsCard icon={DollarSign} title="Revenue (This Month)" value={formatCurrency(stats.monthlyRevenue)} />
        <StatsCard icon={Clock3} title="Pending Verifications" value={stats.pendingVerifications} />
        <StatsCard icon={CarFront} title="Active Rentals" value={stats.activeRentals} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard icon={CalendarDays} title="Page Views (30 Days)" value={stats.pageViews} />
        <StatsCard icon={DollarSign} title="Checkout Starts" value={analytics.checkoutStarts} />
        <StatsCard icon={Clock3} title="Bookings Created" value={analytics.bookingsCreated} />
        <StatsCard icon={CarFront} title="Booking Conversion" value={`${stats.bookingConversionRate}%`} />
      </div>

      <RevenueChart data={revenueSeries} />

      <AnalyticsOverview bookingConversionRate={analytics.bookingConversionRate} topPages={analytics.topPages} />

      <div>
        <h2 className="mb-4 text-xl font-semibold text-slate-900">Recent Bookings</h2>
        <BookingTable bookings={bookingsWithContext} />
      </div>
    </section>
  );
}
