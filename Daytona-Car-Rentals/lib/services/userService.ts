import "server-only";

import type { AuditActorRole, Booking, UpsertUserProfileInput, UserProfile, VerificationStatus } from "@/types";
import { getDocument, listDocuments, setDocument, updateDocument } from "@/lib/firebase/firestore";
import { logAuditEvent } from "@/lib/services/auditService";

function getUserDocumentPath(userId: string) {
  return `users/${userId}`;
}

export async function getUserProfile(userId: string) {
  return getDocument<UserProfile>(getUserDocumentPath(userId));
}

export async function upsertUserProfile(input: UpsertUserProfileInput) {
  const now = new Date();
  const existing = await getUserProfile(input.id);

  await setDocument(
    getUserDocumentPath(input.id),
    {
      ...input,
      createdAt: existing?.createdAt ?? input.createdAt ?? now,
      updatedAt: input.updatedAt ?? now,
    },
    { merge: true },
  );

  return getUserProfile(input.id);
}

export async function updateUserVerificationStatus(
  userId: string,
  verificationStatus: VerificationStatus,
  actorId = "system",
  actorRole: AuditActorRole = "system",
) {
  const existing = await getUserProfile(userId);

  await updateDocument<UserProfile>(getUserDocumentPath(userId), {
    verificationStatus,
    updatedAt: new Date(),
  });

  const updatedUser = await getUserProfile(userId);

  if (updatedUser && existing?.verificationStatus !== updatedUser.verificationStatus) {
    void logAuditEvent({
      entityType: "user",
      entityId: updatedUser.id,
      action: "user.verification_status_changed",
      actorId,
      actorRole,
      before: existing ? { verificationStatus: existing.verificationStatus } : undefined,
      after: {
        verificationStatus: updatedUser.verificationStatus,
      },
    });
  }

  return updatedUser;
}

export async function listUsersByVerificationStatus(verificationStatus?: VerificationStatus) {
  return listDocuments<UserProfile>("users", {
    filters: verificationStatus
      ? [{ field: "verificationStatus", operator: "==", value: verificationStatus }]
      : undefined,
    orderBy: [{ field: "createdAt", direction: "desc" }],
  });
}

export async function syncRepeatCustomerProfile(userId: string) {
  const [user, bookings] = await Promise.all([
    getUserProfile(userId),
    listDocuments<Booking>("bookings", {
      filters: [{ field: "userId", operator: "==", value: userId }],
      orderBy: [{ field: "createdAt", direction: "desc" }],
    }),
  ]);

  if (!user) {
    return null;
  }

  const completedBookings = bookings
    .filter((booking) => booking.status === "completed")
    .sort((first, second) => first.endDate.getTime() - second.endDate.getTime());
  const completedBookingsCount = completedBookings.length;
  const repeatCustomer = completedBookingsCount > 0;
  const repeatCustomerSince = repeatCustomer ? completedBookings[0]?.endDate : undefined;
  const fastTrackEligible = repeatCustomer && user.verificationStatus === "verified";
  const loyaltyDiscountEligible = completedBookingsCount >= 3;

  const hasChanges =
    user.completedBookingsCount !== completedBookingsCount ||
    user.repeatCustomer !== repeatCustomer ||
    (user.repeatCustomerSince?.getTime() ?? 0) !== (repeatCustomerSince?.getTime() ?? 0) ||
    user.fastTrackEligible !== fastTrackEligible ||
    user.loyaltyDiscountEligible !== loyaltyDiscountEligible;

  if (!hasChanges) {
    return user;
  }

  await updateDocument<UserProfile>(getUserDocumentPath(userId), {
    completedBookingsCount,
    repeatCustomer,
    repeatCustomerSince,
    fastTrackEligible,
    loyaltyDiscountEligible,
    updatedAt: new Date(),
  });

  return getUserProfile(userId);
}
