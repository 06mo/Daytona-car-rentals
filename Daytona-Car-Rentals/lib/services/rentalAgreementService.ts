import "server-only";

import { addDocument, FirebaseConfigError, listDocuments, updateDocument } from "@/lib/firebase/firestore";
import { RENTAL_TERMS_VERSION } from "@/lib/data/rentalTerms";
import { logAuditEvent } from "@/lib/services/auditService";
import type { AuditActorRole, RentalAgreement } from "@/types";

const globalMockStore = globalThis as typeof globalThis & {
  __daytonaRentalAgreements?: RentalAgreement[];
};

const mockRentalAgreements = globalMockStore.__daytonaRentalAgreements ?? [];

if (!globalMockStore.__daytonaRentalAgreements) {
  globalMockStore.__daytonaRentalAgreements = mockRentalAgreements;
}

function getCollectionPath() {
  return "rental_agreements";
}

function getMockAgreementByBookingId(bookingId: string) {
  return mockRentalAgreements.find((agreement) => agreement.bookingId === bookingId) ?? null;
}

async function persistNewAgreement(input: Omit<RentalAgreement, "id">) {
  try {
    const id = await addDocument(getCollectionPath(), input);
    return { id, ...input };
  } catch (error) {
    if (!(error instanceof FirebaseConfigError)) {
      throw error;
    }

    const agreement = {
      id: `mock-rental-agreement-${input.bookingId}`,
      ...input,
    };
    mockRentalAgreements.push(agreement);
    return agreement;
  }
}

async function persistAgreementUpdate(agreementId: string, patch: Partial<RentalAgreement>) {
  try {
    await updateDocument<RentalAgreement>(`${getCollectionPath()}/${agreementId}`, patch);
  } catch (error) {
    if (!(error instanceof FirebaseConfigError)) {
      throw error;
    }

    const agreement = mockRentalAgreements.find((item) => item.id === agreementId);

    if (!agreement) {
      throw new Error("Rental agreement not found.");
    }

    Object.assign(agreement, patch);
  }
}

export async function getAgreementForBooking(bookingId: string) {
  try {
    const agreements = await listDocuments<RentalAgreement>(getCollectionPath(), {
      filters: [{ field: "bookingId", operator: "==", value: bookingId }],
      orderBy: [{ field: "createdAt", direction: "desc" }],
      limit: 1,
    });

    return agreements[0] ?? null;
  } catch (error) {
    if (!(error instanceof FirebaseConfigError)) {
      throw error;
    }

    return getMockAgreementByBookingId(bookingId);
  }
}

export async function createAgreementForBooking(bookingId: string, userId: string) {
  const existing = await getAgreementForBooking(bookingId);

  if (existing) {
    return existing;
  }

  const now = new Date();
  const agreement = await persistNewAgreement({
    bookingId,
    userId,
    status: "pending_consent",
    termsVersion: RENTAL_TERMS_VERSION,
    createdAt: now,
    updatedAt: now,
  });

  void logAuditEvent({
    entityType: "rental_agreement",
    entityId: bookingId,
    action: "rental_agreement.created",
    actorId: userId,
    actorRole: "system",
    after: {
      status: agreement.status,
      termsVersion: agreement.termsVersion,
    },
  });

  return agreement;
}

export async function recordConsent(
  bookingId: string,
  userId: string,
  options?: {
    consentedAt?: Date;
    consentIpHint?: string;
    actorId?: string;
    actorRole?: AuditActorRole;
  },
) {
  const existing = (await getAgreementForBooking(bookingId)) ?? (await createAgreementForBooking(bookingId, userId));

  if (existing.status === "signed") {
    return existing;
  }

  if (existing.status === "voided") {
    throw new Error("Voided rental agreements cannot be re-consented.");
  }

  const consentedAt = options?.consentedAt ?? new Date();
  const now = new Date();
  const patch: Partial<RentalAgreement> = {
    status: "consented",
    consentedAt,
    consentIpHint: options?.consentIpHint ?? existing.consentIpHint,
    updatedAt: now,
  };

  await persistAgreementUpdate(existing.id, patch);

  const agreement = { ...existing, ...patch };

  void logAuditEvent({
    entityType: "rental_agreement",
    entityId: bookingId,
    action: "rental_agreement.consented",
    actorId: options?.actorId ?? userId,
    actorRole: options?.actorRole ?? "customer",
    before: {
      status: existing.status,
      consentedAt: existing.consentedAt,
    },
    after: {
      status: agreement.status,
      consentedAt: agreement.consentedAt,
      termsVersion: agreement.termsVersion,
    },
  });

  return agreement;
}

export async function recordPickupSignature(
  bookingId: string,
  adminWitnessId: string,
  customerSignature: string,
  adminWitnessSignature?: string,
) {
  if (!customerSignature.trim()) {
    throw new Error("Customer signature is required.");
  }

  const existing = await getAgreementForBooking(bookingId);

  if (!existing) {
    throw new Error("Rental agreement not found.");
  }

  if (existing.status === "signed") {
    return existing;
  }

  if (existing.status === "voided") {
    throw new Error("Voided rental agreements cannot be signed.");
  }

  const now = new Date();
  const patch: Partial<RentalAgreement> = {
    status: "signed",
    customerSignature,
    signedAt: now,
    adminWitnessId,
    adminWitnessSignature,
    updatedAt: now,
  };

  await persistAgreementUpdate(existing.id, patch);
  const agreement = { ...existing, ...patch };

  void logAuditEvent({
    entityType: "rental_agreement",
    entityId: bookingId,
    action: "rental_agreement.signed",
    actorId: adminWitnessId,
    actorRole: "admin",
    before: {
      status: existing.status,
      signedAt: existing.signedAt,
    },
    after: {
      status: agreement.status,
      signedAt: agreement.signedAt,
      adminWitnessId: agreement.adminWitnessId,
    },
  });

  return agreement;
}

export async function voidAgreement(bookingId: string, adminId: string, reason: string) {
  const existing = await getAgreementForBooking(bookingId);

  if (!existing) {
    throw new Error("Rental agreement not found.");
  }

  if (existing.status === "signed") {
    throw new Error("Signed rental agreements cannot be voided.");
  }

  const now = new Date();
  const patch: Partial<RentalAgreement> = {
    status: "voided",
    voidedAt: now,
    voidedBy: adminId,
    voidReason: reason.trim(),
    updatedAt: now,
  };

  await persistAgreementUpdate(existing.id, patch);
  const agreement = { ...existing, ...patch };

  void logAuditEvent({
    entityType: "rental_agreement",
    entityId: bookingId,
    action: "rental_agreement.voided",
    actorId: adminId,
    actorRole: "admin",
    before: {
      status: existing.status,
    },
    after: {
      status: agreement.status,
      voidReason: agreement.voidReason,
    },
  });

  return agreement;
}
