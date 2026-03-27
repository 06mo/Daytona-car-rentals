import "server-only";

import { mockUserDocuments, mockUsers } from "@/lib/data/mockUsers";
import { FirebaseConfigError, getDocument, listDocuments, setDocument } from "@/lib/firebase/firestore";
import { logAuditEvent } from "@/lib/services/auditService";
import {
  notifyDocumentApproved,
  notifyDocumentRejected,
  notifyDocumentSubmitted,
} from "@/lib/services/notificationService";
import type { DocumentReviewInput, DocumentType, UpsertUserDocumentInput, UserDocument, UserVerificationSummary } from "@/types";
import { getUserProfile, updateUserVerificationStatus } from "@/lib/services/userService";

function getDocumentPath(userId: string, documentType: DocumentType) {
  return `users/${userId}/documents/${documentType}`;
}

function getCollectionPath(userId: string) {
  return `users/${userId}/documents`;
}

export async function upsertUserDocument(userId: string, input: UpsertUserDocumentInput) {
  try {
    await setDocument(
      getDocumentPath(userId, input.type),
      {
        ...input,
        uploadedAt: input.uploadedAt ?? new Date(),
      },
      { merge: true },
    );

    await updateUserVerificationStatus(userId, "pending");

    const document = await getUserDocument(userId, input.type);

    if (document) {
      void logAuditEvent({
        entityType: "document",
        entityId: userId,
        action: "document.submitted",
        actorId: userId,
        actorRole: "customer",
        metadata: {
          documentType: input.type,
          fileName: input.fileName,
          mimeType: input.mimeType,
        },
      });

      void (async () => {
        try {
          const customer = await getUserProfile(userId);

          if (customer) {
            await notifyDocumentSubmitted(customer, input.type);
          }
        } catch (error) {
          console.error("[notification] Failed to queue document submitted notification:", error);
        }
      })();
    }

    return document;
  } catch (error) {
    if (!(error instanceof FirebaseConfigError)) {
      throw error;
    }

    const existingDocs = mockUserDocuments[userId] ?? [];
    const nextDoc: UserDocument = {
      id: input.type,
      ...input,
      uploadedAt: input.uploadedAt ?? new Date(),
    };
    mockUserDocuments[userId] = [
      ...existingDocs.filter((document) => document.type !== input.type),
      nextDoc,
    ];
    const mockUser = mockUsers.find((user) => user.id === userId);
    if (mockUser) {
      mockUser.verificationStatus = "pending";
      mockUser.updatedAt = new Date();
    }
    void logAuditEvent({
      entityType: "document",
      entityId: userId,
      action: "document.submitted",
      actorId: userId,
      actorRole: "customer",
      metadata: {
        documentType: input.type,
        fileName: input.fileName,
        mimeType: input.mimeType,
      },
    });

    if (mockUser) {
      void notifyDocumentSubmitted(mockUser, input.type);
    }

    return nextDoc;
  }
}

export async function getUserDocument(userId: string, documentType: DocumentType) {
  try {
    return await getDocument<UserDocument>(getDocumentPath(userId, documentType));
  } catch (error) {
    if (!(error instanceof FirebaseConfigError)) {
      throw error;
    }

    return mockUserDocuments[userId]?.find((document) => document.type === documentType) ?? null;
  }
}

export async function listUserDocuments(userId: string) {
  try {
    return await listDocuments<UserDocument>(getCollectionPath(userId), {
      orderBy: [{ field: "uploadedAt", direction: "desc" }],
    });
  } catch (error) {
    if (!(error instanceof FirebaseConfigError)) {
      throw error;
    }

    return (mockUserDocuments[userId] ?? []).sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  }
}

export async function reviewUserDocument(userId: string, documentType: DocumentType, input: DocumentReviewInput) {
  try {
    await setDocument(
      getDocumentPath(userId, documentType),
      {
        status: input.status,
        reviewedBy: input.reviewedBy,
        rejectionReason: input.rejectionReason,
        reviewedAt: new Date(),
      },
      { merge: true },
    );

    const documents = await listUserDocuments(userId);
    const hasRejected = documents.some((document) => document.status === "rejected");
    const allApproved = documents.length > 0 && documents.every((document) => document.status === "approved");

    await updateUserVerificationStatus(userId, hasRejected ? "rejected" : allApproved ? "verified" : "pending");

    const document = await getUserDocument(userId, documentType);

    if (document) {
      void logAuditEvent({
        entityType: "document",
        entityId: userId,
        action: input.status === "approved" ? "document.approved" : "document.rejected",
        actorId: input.reviewedBy,
        actorRole: "admin",
        metadata: {
          documentType,
          reviewedBy: input.reviewedBy,
          ...(input.rejectionReason ? { rejectionReason: input.rejectionReason } : {}),
        },
      });

      void (async () => {
        try {
          const customer = await getUserProfile(userId);

          if (!customer) {
            return;
          }

          if (input.status === "approved") {
            await notifyDocumentApproved(customer, documentType);
            return;
          }

          await notifyDocumentRejected(customer, documentType, input.rejectionReason ?? "");
        } catch (error) {
          console.error("[notification] Failed to queue document review notification:", error);
        }
      })();
    }

    return document;
  } catch (error) {
    if (!(error instanceof FirebaseConfigError)) {
      throw error;
    }

    const existingDocs = mockUserDocuments[userId] ?? [];
    const target = existingDocs.find((document) => document.type === documentType);

    if (!target) {
      throw new Error("Document not found.");
    }

    target.status = input.status;
    target.reviewedBy = input.reviewedBy;
    target.rejectionReason = input.rejectionReason;
    target.reviewedAt = new Date();

    const hasRejected = existingDocs.some((document) => document.status === "rejected");
    const allApproved = existingDocs.length > 0 && existingDocs.every((document) => document.status === "approved");
    const mockUser = mockUsers.find((user) => user.id === userId);
    if (mockUser) {
      mockUser.verificationStatus = hasRejected ? "rejected" : allApproved ? "verified" : "pending";
      mockUser.updatedAt = new Date();
    }

    void logAuditEvent({
      entityType: "document",
      entityId: userId,
      action: input.status === "approved" ? "document.approved" : "document.rejected",
      actorId: input.reviewedBy,
      actorRole: "admin",
      metadata: {
        documentType,
        reviewedBy: input.reviewedBy,
        ...(input.rejectionReason ? { rejectionReason: input.rejectionReason } : {}),
      },
    });

    if (mockUser) {
      if (input.status === "approved") {
        void notifyDocumentApproved(mockUser, documentType);
      } else {
        void notifyDocumentRejected(mockUser, documentType, input.rejectionReason ?? "");
      }
    }

    return target;
  }
}

export async function getUserVerificationSummary(userId: string): Promise<UserVerificationSummary | null> {
  const user = await getUserProfile(userId);

  if (!user) {
    return null;
  }

  return {
    userId,
    verificationStatus: user.verificationStatus,
    documents: await listUserDocuments(userId),
  };
}
