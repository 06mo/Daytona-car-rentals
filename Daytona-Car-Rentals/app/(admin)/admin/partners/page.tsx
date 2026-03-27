import { listPartners, getPartnerStats } from "@/lib/services/partnerService";
import { formatCurrency } from "@/lib/utils";

function formatBookingsLabel(totalBookings: number, last30DayBookings: number) {
  if (last30DayBookings > 0) {
    return `${totalBookings} (${last30DayBookings} mo)`;
  }

  return `${totalBookings} (-)`;
}

export default async function AdminPartnersPage() {
  const partners = await listPartners();
  const partnerStats = await Promise.all(partners.map((partner) => getPartnerStats(partner)));

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">Admin</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Partners</h1>
        </div>
        <p className="max-w-xl text-sm text-slate-500">
          To add a partner, create a document in the <code>partners</code> collection in Firestore.
        </p>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        {partnerStats.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 px-6 py-12 text-center text-slate-500">
            No partners found. Add partner documents in Firestore to start tracking referrals.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="pb-3 font-medium">Partner</th>
                  <th className="pb-3 font-medium">Code</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Bookings</th>
                  <th className="pb-3 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {partnerStats.map(({ partner, totalBookings, last30DayBookings, totalRevenueCents }) => (
                  <tr key={partner.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-4">
                      <p className="font-medium text-slate-900">{partner.name}</p>
                      <p className="text-slate-500">{partner.contactEmail}</p>
                    </td>
                    <td className="py-4 font-mono text-xs text-slate-700">{partner.code}</td>
                    <td className="py-4 text-slate-700">{partner.status === "active" ? "Active" : "Inactive"}</td>
                    <td className="py-4 text-slate-700">{formatBookingsLabel(totalBookings, last30DayBookings)}</td>
                    <td className="py-4 text-slate-700">{formatCurrency(totalRevenueCents / 100)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
