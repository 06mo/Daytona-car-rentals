import { Button, Section, Text } from "@react-email/components";

import { BaseEmail } from "@/emails/BaseEmail";

type PaymentFailedEmailProps = {
  customerName: string;
  vehicleDescription: string;
  retryUrl: string;
};

export function PaymentFailedEmail({ customerName, vehicleDescription, retryUrl }: PaymentFailedEmailProps) {
  return (
    <BaseEmail preview="Payment could not be processed." title="Action required: payment could not be processed">
      <Text style={text}>Hi {customerName},</Text>
      <Text style={text}>
        We were unable to complete the payment tied to your booking for {vehicleDescription}.
      </Text>
      <Text style={text}>Please return to your booking page to retry payment or contact support if you need help.</Text>
      <Section style={buttonRow}>
        <Button href={retryUrl} style={button}>
          Retry payment
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
