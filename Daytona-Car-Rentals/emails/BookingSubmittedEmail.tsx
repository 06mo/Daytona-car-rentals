import { Button, Section, Text } from "@react-email/components";

import { BaseEmail } from "@/emails/BaseEmail";

type BookingSubmittedEmailProps = {
  customerName: string;
  vehicleDescription: string;
  startDate: string;
  endDate: string;
  pickupLocation: string;
  depositAmount: string;
};

export function BookingSubmittedEmail({
  customerName,
  vehicleDescription,
  startDate,
  endDate,
  pickupLocation,
  depositAmount,
}: BookingSubmittedEmailProps) {
  return (
    <BaseEmail preview="Your booking request is received." title="Your booking request is received">
      <Text style={text}>Hi {customerName},</Text>
      <Text style={text}>
        We received your booking request for {vehicleDescription} from {startDate} to {endDate}.
      </Text>
      <Text style={text}>Pickup location: {pickupLocation}</Text>
      <Text style={text}>Deposit collected: {depositAmount}</Text>
      <Text style={text}>We&apos;ll confirm the booking as soon as your documents are verified.</Text>
      <Section style={buttonRow}>
        <Button href="https://daytonacarrentals.com/dashboard" style={button}>
          View booking dashboard
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
