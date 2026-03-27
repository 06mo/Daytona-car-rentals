import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { CustomerSidebar } from "@/components/layout/CustomerSidebar";
import { getAdminAuth } from "@/lib/firebase/admin";

export default async function CustomerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const sessionToken = cookieStore.get("__session")?.value ?? cookieStore.get("token")?.value;
  const returnUrl = headerStore.get("x-return-url") ?? "/dashboard";
  const isPublicBookingFlow = returnUrl.startsWith("/booking/") && !returnUrl.startsWith("/booking/confirmation/");

  if (isPublicBookingFlow) {
    return <>{children}</>;
  }

  if (!sessionToken) {
    redirect(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
  }

  const adminAuth = getAdminAuth();

  if (!adminAuth) {
    redirect(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
  }

  try {
    await adminAuth.verifyIdToken(sessionToken);
  } catch {
    redirect(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
  }

  return (
    <div className="mx-auto grid min-h-[calc(100vh-8rem)] w-full max-w-6xl gap-6 px-6 py-10 lg:grid-cols-[220px_1fr]">
      <CustomerSidebar />
      <div>{children}</div>
    </div>
  );
}
