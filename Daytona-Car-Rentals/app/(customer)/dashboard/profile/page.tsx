import { redirect } from "next/navigation";

import { ProfileForm } from "@/components/customer/ProfileForm";
import { getServerUserId } from "@/lib/auth/getServerUserId";
import { getUserProfile } from "@/lib/services/userService";

export default async function CustomerProfilePage() {
  const userId = await getServerUserId();

  if (!userId) {
    redirect("/login?returnUrl=%2Fdashboard%2Fprofile");
  }

  const profile = await getUserProfile(userId);

  if (!profile) {
    redirect("/dashboard");
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">Portal</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Profile</h1>
        <p className="mt-3 max-w-2xl text-slate-600">Keep your contact details up to date so booking updates reach you quickly.</p>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Member Status</h2>
        <div className="mt-4 grid gap-2 text-sm text-slate-600">
          <p>Completed bookings: {profile.completedBookingsCount ?? 0}</p>
          <p>Status: {profile.repeatCustomer ? "Returning customer" : "New customer"}</p>
          <p>Fast-track eligible: {profile.fastTrackEligible ? "Yes" : "No"}</p>
          <p>Loyalty discount eligible: {profile.loyaltyDiscountEligible ? "Yes" : "No"}</p>
          {profile.repeatCustomerSince ? <p>Returning since: {profile.repeatCustomerSince.toLocaleDateString()}</p> : null}
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <ProfileForm profile={profile} />
      </div>
    </section>
  );
}
