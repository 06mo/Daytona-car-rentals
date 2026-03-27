import Stripe from "stripe";

import { reportMonitoringEvent } from "@/lib/monitoring/monitoring";
import { markAdjustmentPaid } from "@/lib/services/adjustmentService";
import { logAuditEvent } from "@/lib/services/auditService";
import { notifyPaymentRefunded } from "@/lib/services/notificationService";
import { getUserProfile } from "@/lib/services/userService";
import { getVehicleById } from "@/lib/services/vehicleService";
import { syncBookingPaymentStatus } from "@/lib/stripe/server";

export async function handleStripeWebhookEvent(event: Stripe.Event) {
  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const booking = await syncBookingPaymentStatus(paymentIntent.id, {
        paymentStatus: "paid",
      });
      if (booking) {
        void logAuditEvent({
          entityType: "payment",
          entityId: booking.id,
          action: "payment.succeeded",
          actorId: "system",
          actorRole: "system",
          metadata: {
            stripePaymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
          },
        });
      }
      break;
    }
    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const booking = await syncBookingPaymentStatus(paymentIntent.id, {
        paymentStatus: "failed",
        status: "payment_failed",
      });
      if (booking) {
        void logAuditEvent({
          entityType: "payment",
          entityId: booking.id,
          action: "payment.failed",
          actorId: "system",
          actorRole: "system",
          metadata: {
            stripePaymentIntentId: paymentIntent.id,
            failureMessage: paymentIntent.last_payment_error?.message ?? "Payment failed.",
          },
        });
        void reportMonitoringEvent({
          source: "stripe.webhooks.payment_failed",
          message: "Stripe payment intent failed.",
          severity: "warning",
          error: paymentIntent.last_payment_error?.message ?? "Payment failed.",
          context: {
            bookingId: booking.id,
            paymentIntentId: paymentIntent.id,
            failureMessage: paymentIntent.last_payment_error?.message ?? null,
          },
          alert: false,
        });
      }
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      if (typeof charge.payment_intent === "string") {
        const booking = await syncBookingPaymentStatus(charge.payment_intent, {
          paymentStatus:
            charge.amount_refunded > 0 && charge.amount_refunded < charge.amount
              ? "partially_refunded"
              : "refunded",
        });
        if (booking) {
          void logAuditEvent({
            entityType: "payment",
            entityId: booking.id,
            action: "payment.refunded",
            actorId: "system",
            actorRole: "system",
            metadata: {
              stripePaymentIntentId: charge.payment_intent,
              amountRefunded: charge.amount_refunded,
            },
          });
          void (async () => {
            try {
              const customer = await getUserProfile(booking.userId);

              if (customer) {
                await notifyPaymentRefunded(booking, customer);
              }
            } catch (error) {
              await reportMonitoringEvent({
                source: "stripe.webhooks.payment_refunded_notification",
                message: "Payment refunded notification queueing failed.",
                severity: "warning",
                error,
                context: {
                  bookingId: booking.id,
                  paymentIntentId: charge.payment_intent,
                },
                alert: false,
              });
            }
          })();
        }
      }
      break;
    }
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const adjustmentId = session.metadata?.adjustmentId;
      const bookingId = session.metadata?.bookingId;

      if (!adjustmentId || !bookingId) {
        break;
      }

      await markAdjustmentPaid(
        bookingId,
        adjustmentId,
        typeof session.payment_intent === "string" ? session.payment_intent : null,
      );
      break;
    }
    default:
      break;
  }
}
