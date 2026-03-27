export type AuditEntityType =
  | "booking"
  | "document"
  | "payment"
  | "user"
  | "vehicle";

export type AuditAction =
  | "booking.created"
  | "booking.status_changed"
  | "booking.cancelled"
  | "document.submitted"
  | "document.approved"
  | "document.rejected"
  | "payment.intent_created"
  | "payment.succeeded"
  | "payment.failed"
  | "payment.refunded"
  | "user.verification_status_changed";

export type AuditActorRole = "admin" | "customer" | "system";

export type AuditLog = {
  id: string;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  actorId: string;
  actorRole: AuditActorRole;
  timestamp: Date;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type CreateAuditLogInput = Omit<AuditLog, "id" | "timestamp">;
