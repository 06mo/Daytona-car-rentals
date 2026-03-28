export type AuditEntityType =
  | "booking"
  | "document"
  | "insurance"
  | "payment"
  | "rental_agreement"
  | "user"
  | "vehicle";

export type AuditAction =
  | "booking.created"
  | "booking.status_changed"
  | "booking.cancelled"
  | "booking_adjustment_created"
  | "booking_adjustment_waived"
  | "adjustment_payment_requested"
  | "adjustment_payment_received"
  | "booking_extended"
  | "booking.checklist_draft_saved"
  | "booking.checklist_submitted"
  | "booking.pickup_completed"
  | "booking.dropoff_completed"
  | "document.submitted"
  | "document.approved"
  | "document.rejected"
  | "insurance.verification_requested"
  | "insurance.verification_resolved"
  | "insurance.override_applied"
  | "rental_agreement.created"
  | "rental_agreement.consented"
  | "rental_agreement.signed"
  | "rental_agreement.voided"
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
