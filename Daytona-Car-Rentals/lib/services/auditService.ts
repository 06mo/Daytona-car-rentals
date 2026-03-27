import "server-only";

import { addDocument, FirebaseConfigError, listDocuments } from "@/lib/firebase/firestore";
import type { AuditLog, CreateAuditLogInput } from "@/types";

export async function logAuditEvent(input: CreateAuditLogInput): Promise<void> {
  try {
    await addDocument("audit_logs", {
      ...input,
      timestamp: new Date(),
    });
  } catch (error) {
    if (error instanceof FirebaseConfigError) {
      return;
    }

    console.error("[audit] Failed to write audit event:", input.action, error);
  }
}

export async function getAuditLogsForEntity(entityId: string, limit = 50): Promise<AuditLog[]> {
  try {
    return await listDocuments<AuditLog>("audit_logs", {
      filters: [{ field: "entityId", operator: "==", value: entityId }],
      orderBy: [{ field: "timestamp", direction: "desc" }],
      limit,
    });
  } catch (error) {
    if (error instanceof FirebaseConfigError) {
      return [];
    }

    throw error;
  }
}

export async function getAuditLogsForActor(actorId: string, limit = 50): Promise<AuditLog[]> {
  try {
    return await listDocuments<AuditLog>("audit_logs", {
      filters: [{ field: "actorId", operator: "==", value: actorId }],
      orderBy: [{ field: "timestamp", direction: "desc" }],
      limit,
    });
  } catch (error) {
    if (error instanceof FirebaseConfigError) {
      return [];
    }

    throw error;
  }
}
