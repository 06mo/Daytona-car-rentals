import { Button, Section, Text } from "@react-email/components";

import { BaseEmail } from "@/emails/BaseEmail";

type DocumentApprovedEmailProps = {
  customerName: string;
  docType: string;
  bookingUrl?: string;
};

export function DocumentApprovedEmail({ customerName, docType, bookingUrl }: DocumentApprovedEmailProps) {
  return (
    <BaseEmail preview="Your document has been approved." title="Document approved — you're almost ready to go">
      <Text style={text}>Hi {customerName},</Text>
      <Text style={text}>Your {docType.replaceAll("_", " ")} has been approved.</Text>
      <Text style={text}>You&apos;re one step closer to pickup. Keep an eye on your dashboard for any remaining requirements.</Text>
      {bookingUrl ? (
        <Section style={buttonRow}>
          <Button href={bookingUrl} style={button}>
            View your booking
          </Button>
        </Section>
      ) : null}
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
