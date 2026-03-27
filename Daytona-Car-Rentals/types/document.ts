import type { VerificationStatus } from "@/types/user";

export type DocumentType = "drivers_license" | "insurance_card";

export type DocumentStatus = "pending" | "approved" | "rejected";

export type UserDocument = {
  id: string;
  type: DocumentType;
  storageRef: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  status: DocumentStatus;
  rejectionReason?: string;
  reviewedBy?: string;
  uploadedAt: Date;
  reviewedAt?: Date;
};

export type UpsertUserDocumentInput = Omit<UserDocument, "uploadedAt" | "reviewedAt" | "id"> & {
  uploadedAt?: Date;
  reviewedAt?: Date;
};

export type DocumentReviewInput = {
  status: DocumentStatus;
  reviewedBy: string;
  rejectionReason?: string;
};

export type UserVerificationSummary = {
  userId: string;
  verificationStatus: VerificationStatus;
  documents: UserDocument[];
};
