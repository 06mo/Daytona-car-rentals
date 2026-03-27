import "server-only";

import { cookies } from "next/headers";

import { getAdminAuth } from "@/lib/firebase/admin";

export async function getServerUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("__session")?.value ?? cookieStore.get("token")?.value;
  const adminAuth = getAdminAuth();

  if (!token || !adminAuth) {
    return null;
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}
