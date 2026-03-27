import { Text } from "@react-email/components";

import { BaseEmail } from "@/emails/BaseEmail";

type PickupReminderEmailProps = {
  customerName: string;
  vehicleDescription: string;
  pickupTime: string;
  pickupLocation: string;
  bookingId: string;
};

export function PickupReminderEmail({
  customerName,
  vehicleDescription,
  pickupTime,
  pickupLocation,
  bookingId,
}: PickupReminderEmailProps) {
  return (
    <BaseEmail preview="Your pickup is tomorrow." title="Pickup tomorrow — here are your details">
      <Text style={text}>Hi {customerName},</Text>
      <Text style={text}>This is a reminder that your {vehicleDescription} pickup is tomorrow at {pickupTime}.</Text>
      <Text style={text}>Pickup location: {pickupLocation}</Text>
      <Text style={text}>Booking reference: {bookingId}</Text>
      <Text style={text}>Please bring your driver&apos;s license and booking confirmation.</Text>
    </BaseEmail>
  );
}

const text = {
  color: "#334155",
  fontSize: "16px",
  lineHeight: "26px",
};
