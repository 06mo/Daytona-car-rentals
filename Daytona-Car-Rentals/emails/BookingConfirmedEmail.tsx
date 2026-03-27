import { Button, Section, Text } from "@react-email/components";

import { BaseEmail } from "@/emails/BaseEmail";

type BookingConfirmedEmailProps = {
  customerName: string;
  vehicleDescription: string;
  startDate: string;
  endDate: string;
  pickupLocation: string;
  confirmationNumber: string;
};

export function BookingConfirmedEmail({
  customerName,
  vehicleDescription,
  startDate,
  endDate,
  pickupLocation,
  confirmationNumber,
}: BookingConfirmedEmailProps) {
  return (
    <BaseEmail preview="Your booking is confirmed." title="Your booking is confirmed — see you soon">
      <Text style={text}>Hi {customerName},</Text>
      <Text style={text}>
        Your {vehicleDescription} booking is confirmed for {startDate} to {endDate}.
      </Text>
      <Text style={text}>Pickup location: {pickupLocation}</Text>
      <Text style={text}>Confirmation number: {confirmationNumber}</Text>
      <Section style={buttonRow}>
        <Button href="https://daytonacarrentals.com/dashboard" style={button}>
          Review booking details
        </Button>
      </Section>
    </BaseEmail>
  );
}

const text = {
  color: "#334155",
  fontSize: "16px",
  lineHeight: "26px",
};

const buttonRow = {
  marginTop: "24px",
};

const button = {
  backgroundColor: "#f97316",
  borderRadius: "999px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "700",
  padding: "12px 20px",
  textDecoration: "none",
};
