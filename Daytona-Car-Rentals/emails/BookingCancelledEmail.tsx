import { Text } from "@react-email/components";

import { BaseEmail } from "@/emails/BaseEmail";

type BookingCancelledEmailProps = {
  customerName: string;
  vehicleDescription: string;
  startDate: string;
  refundNote?: string;
};

export function BookingCancelledEmail({
  customerName,
  vehicleDescription,
  startDate,
  refundNote,
}: BookingCancelledEmailProps) {
  return (
    <BaseEmail preview="Your booking has been cancelled." title="Your booking has been cancelled">
      <Text style={text}>Hi {customerName},</Text>
      <Text style={text}>
        Your booking for {vehicleDescription} starting on {startDate} has been cancelled.
      </Text>
      {refundNote ? <Text style={text}>{refundNote}</Text> : null}
      <Text style={text}>If you need help with a replacement booking, reply to this email and our team will help.</Text>
    </BaseEmail>
  );
}

const text = {
  color: "#334155",
  fontSize: "16px",
  lineHeight: "26px",
};
