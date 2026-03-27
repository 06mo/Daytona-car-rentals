import Link from "next/link";

import { listAdminUsers } from "@/lib/services/adminService";

export default async function AdminVerificationsPage() {
  const users = await listAdminUsers();
  const pendingUsers = users.filter((user) => user.verificationStatus === "pending");

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">Admin</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Pending Verifications</h1>
      </div>
      {pendingUsers.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-slate-500">
          All caught up! No pending verifications.
        </div>
      ) : (
        <div className="grid gap-4">
          {pendingUsers.map((user) => (
            <div key={user.id} className="flex items-center justify-between rounded-[2rem] border border-slate-200 bg-white px-6 py-5 shadow-sm">
              <div>
                <p className="font-semibold text-slate-900">{user.displayName}</p>
                <p className="text-sm text-slate-500">{user.email}</p>
              </div>
              <Link className="text-sm font-semibold text-orange-500" href={`/admin/customers/${user.id}`}>
                Review
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
