export type RentalAgreementStatus = "pending_consent" | "consented" | "signed" | "voided";

export type RentalAgreement = {
  id: string;
  bookingId: string;
  userId: string;
  status: RentalAgreementStatus;
  termsVersion: string;
  consentedAt?: Date;
  consentIpHint?: string;
  customerSignature?: string;
  signedAt?: Date;
  adminWitnessId?: string;
  adminWitnessSignature?: string;
  voidedAt?: Date;
  voidedBy?: string;
  voidReason?: string;
  createdAt: Date;
  updatedAt: Date;
};
