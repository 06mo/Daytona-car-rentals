import "server-only";

import Stripe from "stripe";

import { listDocuments, updateDocument } from "@/lib/firebase/firestore";
import { logAuditEvent } from "@/lib/services/auditService";
import { getUserProfile, upsertUserProfile } from "@/lib/services/userService";
import type { Booking, BookingPricing, UserProfile, Vehicle } from "@/types";

export class StripeConfigError extends Error {
  constructor(message = "Stripe server credentials are not configured.") {
    super(message);
    this.name = "StripeConfigError";
  }
}

export function getStripeServer() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new StripeConfigError();
  }

  return new Stripe(secretKey, {
    apiVersion: "2026-03-25.dahlia",
  });
}

export async function retrievePaymentIntent(paymentIntentId: string) {
  const stripe = getStripeServer();
  return stripe.paymentIntents.retrieve(paymentIntentId);
}

export async function getOrCreateStripeCustomer(userId: string, email: string | null) {
  const existingUser = await getUserProfile(userId);

  if (existingUser?.stripeCustomerId) {
    return existingUser.stripeCustomerId;
  }

  const stripe = getStripeServer();
  const customer = await stripe.customers.create({
    email: email ?? undefined,
    metadata: {
      firebaseUserId: userId,
    },
  });

  await upsertUserProfile({
    id: userId,
    email: existingUser?.email ?? email ?? "",
    displayName: existingUser?.displayName ?? "Daytona Customer",
    phone: existingUser?.phone ?? "",
    dateOfBirth: existingUser?.dateOfBirth ?? "",
    address: existingUser?.address,
    verificationStatus: existingUser?.verificationStatus ?? "unverified",
    role: existingUser?.role ?? "customer",
    stripeCustomerId: customer.id,
    lastLoginAt: existingUser?.lastLoginAt,
  });

  return customer.id;
}

export async function createPaymentIntentForBooking({
  endDate,
  pricing,
  promoCode,
  referralCode,
  startDate,
  userId,
  userEmail,
  vehicle,
}: {
  endDate: Date;
  pricing: BookingPricing;
  promoCode?: string;
  referralCode?: string;
  startDate: Date;
  userEmail: string | null;
  userId: string;
  vehicle: Vehicle;
}) {
  const stripe = getStripeServer();
  const stripeCustomerId = await getOrCreateStripeCustomer(userId, userEmail);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: vehicle.depositAmount,
    currency: "usd",
    customer: stripeCustomerId,
    automatic_payment_methods: {
      enabled: true,
    },
    metadata: {
      vehicleId: vehicle.id,
      userId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalAmount: String(pricing.totalAmount),
      depositAmount: String(vehicle.depositAmount),
      ...(promoCode ? { promoCode } : {}),
      ...(referralCode ? { referralCode } : {}),
    },
    description: `Deposit - ${vehicle.year} ${vehicle.make} ${vehicle.model}`,
  });

  void logAuditEvent({
    entityType: "payment",
    entityId: paymentIntent.id,
    action: "payment.intent_created",
    actorId: userId,
    actorRole: "customer",
    metadata: {
      stripePaymentIntentId: paymentIntent.id,
      depositAmount: vehicle.depositAmount,
      vehicleId: vehicle.id,
    },
  });

  return {
    paymentIntent,
    pricing,
    stripeCustomerId,
  };
}

export async function refundPaymentIntent(paymentIntentId: string) {
  const stripe = getStripeServer();
  return stripe.refunds.create({ payment_intent: paymentIntentId });
}

export async function constructWebhookEvent(payload: string | Buffer, signature: string) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new StripeConfigError("Stripe webhook secret is not configured.");
  }

  const stripe = getStripeServer();
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

export async function findBookingByPaymentIntentId(paymentIntentId: string) {
  const bookings = await listDocuments<Booking>("bookings", {
    filters: [{ field: "stripePaymentIntentId", operator: "==", value: paymentIntentId }],
    limit: 1,
  });

  return bookings[0] ?? null;
}

export async function syncBookingPaymentStatus(
  paymentIntentId: string,
  values: Partial<Pick<Booking, "paymentStatus" | "status">>,
) {
  const booking = await findBookingByPaymentIntentId(paymentIntentId);

  if (!booking) {
    return null;
  }

  const update: Partial<Booking> = {
    updatedAt: new Date(),
    ...values,
  };

  if (booking.paymentStatus === update.paymentStatus && booking.status === update.status) {
    return booking;
  }

  await updateDocument<Booking>(`bookings/${booking.id}`, update);
  return booking;
}
