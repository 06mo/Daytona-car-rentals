import type { DecodedIdToken } from "firebase-admin/auth";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { getAdminAuth } from "@/lib/firebase/admin";
import { listAdminUsers } from "@/lib/services/adminService";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const sessionToken = cookieStore.get("__session")?.value ?? cookieStore.get("token")?.value;
  const returnUrl = headerStore.get("x-return-url") ?? "/admin/dashboard";

  if (!sessionToken) {
    redirect(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
  }

  const adminAuth = getAdminAuth();

  if (!adminAuth) {
    redirect(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
  }

  let decodedToken: DecodedIdToken;

  try {
    decodedToken = await adminAuth.verifyIdToken(sessionToken);
  } catch {
    redirect(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
  }

  if (decodedToken.role !== "admin") {
    redirect("/dashboard");
  }

  const pendingCount = (await listAdminUsers()).filter((user) => user.verificationStatus === "pending").length;

  return (
    <div className="mx-auto grid min-h-[calc(100vh-8rem)] w-full max-w-6xl gap-6 px-6 py-10 lg:grid-cols-[220px_1fr]">
      <AdminSidebar pendingCount={pendingCount} />
      <div>{children}</div>
    </div>
  );
}
