import "server-only";

import type { ReactElement } from "react";

import { Resend } from "resend";
import twilio from "twilio";

import { BookingCancelledEmail } from "@/emails/BookingCancelledEmail";
import { BookingConfirmedEmail } from "@/emails/BookingConfirmedEmail";
import { BookingSubmittedEmail } from "@/emails/BookingSubmittedEmail";
import { DocumentApprovedEmail } from "@/emails/DocumentApprovedEmail";
import { DocumentRejectedEmail } from "@/emails/DocumentRejectedEmail";
import { DocumentSubmittedEmail } from "@/emails/DocumentSubmittedEmail";
import { PaymentFailedEmail } from "@/emails/PaymentFailedEmail";
import { PaymentRefundedEmail } from "@/emails/PaymentRefundedEmail";
import { PickupReminderEmail } from "@/emails/PickupReminderEmail";
import { ReturnReminderEmail } from "@/emails/ReturnReminderEmail";
import type { Booking, DocumentType, UserProfile, Vehicle } from "@/types";
import { formatCurrency } from "@/lib/utils";

export class NotificationConfigError extends Error {
  constructor(channel: "email" | "sms") {
    super(`Notification channel "${channel}" is not configured.`);
    this.name = "NotificationConfigError";
  }
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  react: ReactElement;
}): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;

    if (!apiKey || !from || !options.to) {
      throw new NotificationConfigError("email");
    }

    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to: options.to,
      subject: options.subject,
      react: options.react,
    });
  } catch (error) {
    if (error instanceof NotificationConfigError) {
      return;
    }

    console.error("[notification] Failed to send email:", options.subject, error);
  }
}

export async function sendSms(options: {
  to: string;
  body: string;
}): Promise<void> {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM_NUMBER;

    if (!accountSid || !authToken || !from || !options.to) {
      throw new NotificationConfigError("sms");
    }

    const client = twilio(accountSid, authToken);

    await client.messages.create({
      body: options.body,
      from,
      to: normalizePhoneNumber(options.to),
    });
  } catch (error) {
    if (error instanceof NotificationConfigError) {
      return;
    }

    console.error("[notification] Failed to send SMS:", error);
  }
}

export async function notifyBookingSubmitted(booking: Booking, customer: UserProfile, vehicle: Vehicle): Promise<void> {
  try {
    await sendEmail({
      to: customer.email,
      subject: "Your booking request is received",
      react: (
        <BookingSubmittedEmail
          customerName={customer.displayName}
          vehicleDescription={getVehicleDescription(vehicle)}
          startDate={formatDate(booking.startDate)}
          endDate={formatDate(booking.endDate)}
          pickupLocation={booking.pickupLocation}
          depositAmount={formatCurrency(booking.pricing.depositAmount / 100)}
        />
      ),
    });

    if (customer.smsOptIn === true) {
      await sendSms({
        to: customer.phone,
        body: `Daytona Car Rentals: We received your booking for ${getVehicleDescription(vehicle)} (${formatShortDate(booking.startDate)}-${formatShortDate(booking.endDate)}). We'll confirm once your documents are verified. Reply STOP to opt out.`,
      });
    }
  } catch (error) {
    console.error("[notification] notifyBookingSubmitted failed:", error);
  }
}

export async function notifyBookingConfirmed(booking: Booking, customer: UserProfile, vehicle: Vehicle): Promise<void> {
  try {
    await sendEmail({
      to: customer.email,
      subject: "Your booking is confirmed — see you soon",
      react: (
        <BookingConfirmedEmail
          customerName={customer.displayName}
          vehicleDescription={getVehicleDescription(vehicle)}
          startDate={formatDate(booking.startDate)}
          endDate={formatDate(booking.endDate)}
          pickupLocation={booking.pickupLocation}
          confirmationNumber={booking.id}
        />
      ),
    });

    if (customer.smsOptIn === true) {
      await sendSms({
        to: customer.phone,
        body: `Daytona Car Rentals: Your booking for ${getVehicleDescription(vehicle)} on ${formatShortDate(booking.startDate)} is confirmed! Check your email for full details.`,
      });
    }
  } catch (error) {
    console.error("[notification] notifyBookingConfirmed failed:", error);
  }
}

export async function notifyBookingCancelledByCustomer(
  booking: Booking,
  customer: UserProfile,
  vehicle: Vehicle,
): Promise<void> {
  try {
    await sendEmail({
      to: customer.email,
      subject: "Your booking has been cancelled",
      react: (
        <BookingCancelledEmail
          customerName={customer.displayName}
          vehicleDescription={getVehicleDescription(vehicle)}
          startDate={formatDate(booking.startDate)}
          refundNote={
            booking.paymentStatus === "refunded" || booking.paymentStatus === "partially_refunded"
              ? `Any eligible refund will return to your original payment method.`
              : undefined
          }
        />
      ),
    });
  } catch (error) {
    console.error("[notification] notifyBookingCancelledByCustomer failed:", error);
  }
}

export async function notifyBookingCancelledByAdmin(
  booking: Booking,
  customer: UserProfile,
  vehicle: Vehicle,
): Promise<void> {
  try {
    await sendEmail({
      to: customer.email,
      subject: "Your booking has been cancelled",
      react: (
        <BookingCancelledEmail
          customerName={customer.displayName}
          vehicleDescription={getVehicleDescription(vehicle)}
          startDate={formatDate(booking.startDate)}
          refundNote={
            booking.paymentStatus === "refunded" || booking.paymentStatus === "partially_refunded"
              ? `A refund is being processed to your original payment method.`
              : undefined
          }
        />
      ),
    });

    if (customer.smsOptIn === true) {
      await sendSms({
        to: customer.phone,
        body: `Daytona Car Rentals: Your booking for ${getVehicleDescription(vehicle)} on ${formatShortDate(booking.startDate)} has been cancelled. Check your email for details.`,
      });
    }
  } catch (error) {
    console.error("[notification] notifyBookingCancelledByAdmin failed:", error);
  }
}

export async function notifyPaymentFailed(booking: Booking, customer: UserProfile, vehicle?: Vehicle): Promise<void> {
  try {
    await sendEmail({
      to: customer.email,
      subject: "Action required: payment could not be processed",
      react: (
        <PaymentFailedEmail
          customerName={customer.displayName}
          vehicleDescription={vehicle ? getVehicleDescription(vehicle) : `booking ${booking.id}`}
          retryUrl={`https://daytonacarrentals.com/booking/confirmation/${booking.id}`}
        />
      ),
    });
  } catch (error) {
    console.error("[notification] notifyPaymentFailed failed:", error);
  }
}

export async function notifyPaymentRefunded(booking: Booking, customer: UserProfile): Promise<void> {
  try {
    await sendEmail({
      to: customer.email,
      subject: "Refund on its way",
      react: (
        <PaymentRefundedEmail
          customerName={customer.displayName}
          refundAmount={formatCurrency(booking.pricing.depositAmount / 100)}
        />
      ),
    });
  } catch (error) {
    console.error("[notification] notifyPaymentRefunded failed:", error);
  }
}

export async function notifyDocumentSubmitted(customer: UserProfile, docType: DocumentType): Promise<void> {
  try {
    await sendEmail({
      to: process.env.ADMIN_NOTIFICATION_EMAIL ?? "",
      subject: `New document for review: ${customer.displayName}`,
      react: (
        <DocumentSubmittedEmail
          customerName={customer.displayName}
          docType={docType}
          reviewUrl="https://daytonacarrentals.com/admin/verifications"
        />
      ),
    });
  } catch (error) {
    console.error("[notification] notifyDocumentSubmitted failed:", error);
  }
}

export async function notifyDocumentApproved(customer: UserProfile, docType: DocumentType): Promise<void> {
  try {
    await sendEmail({
      to: customer.email,
      subject: "Document approved — you're almost ready to go",
      react: (
        <DocumentApprovedEmail
          customerName={customer.displayName}
          docType={docType}
          bookingUrl="https://daytonacarrentals.com/dashboard"
        />
      ),
    });
  } catch (error) {
    console.error("[notification] notifyDocumentApproved failed:", error);
  }
}

export async function notifyDocumentRejected(
  customer: UserProfile,
  docType: DocumentType,
  rejectionReason: string,
): Promise<void> {
  try {
    await sendEmail({
      to: customer.email,
      subject: "Document needs attention",
      react: (
        <DocumentRejectedEmail
          customerName={customer.displayName}
          docType={docType}
          rejectionReason={rejectionReason}
          uploadUrl="https://daytonacarrentals.com/dashboard"
        />
      ),
    });
  } catch (error) {
    console.error("[notification] notifyDocumentRejected failed:", error);
  }
}

export async function notifyPickupReminder(booking: Booking, customer: UserProfile, vehicle: Vehicle): Promise<void> {
  try {
    await sendEmail({
      to: customer.email,
      subject: "Pickup tomorrow — here are your details",
      react: (
        <PickupReminderEmail
          customerName={customer.displayName}
          vehicleDescription={getVehicleDescription(vehicle)}
          pickupTime={formatDate(booking.startDate)}
          pickupLocation={booking.pickupLocation}
          bookingId={booking.id}
        />
      ),
    });

    if (customer.smsOptIn === true) {
      await sendSms({
        to: customer.phone,
        body: `Daytona Car Rentals: Reminder - pickup tomorrow at ${booking.pickupLocation}. Bring your license and booking confirmation #${booking.id}.`,
      });
    }
  } catch (error) {
    console.error("[notification] notifyPickupReminder failed:", error);
  }
}

export async function notifyReturnReminder(booking: Booking, customer: UserProfile, vehicle: Vehicle): Promise<void> {
  try {
    await sendEmail({
      to: customer.email,
      subject: "Your rental return is tomorrow",
      react: (
        <ReturnReminderEmail
          customerName={customer.displayName}
          vehicleDescription={getVehicleDescription(vehicle)}
          returnLocation={booking.returnLocation}
          returnDate={formatDate(booking.endDate)}
        />
      ),
    });
  } catch (error) {
    console.error("[notification] notifyReturnReminder failed:", error);
  }
}

function getVehicleDescription(vehicle: Vehicle) {
  return `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function formatShortDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(value);
}

function normalizePhoneNumber(input: string) {
  const trimmed = input.trim();

  if (trimmed.startsWith("+")) {
    const digits = trimmed.replace(/[^\d+]/g, "");

    if (/^\+\d{10,15}$/.test(digits)) {
      return digits;
    }
  }

  const digits = trimmed.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  throw new Error("Phone number must be a valid E.164-compatible number.");
}
