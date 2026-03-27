import { Button, Section, Text } from "@react-email/components";

import { BaseEmail } from "@/emails/BaseEmail";

type DocumentRejectedEmailProps = {
  customerName: string;
  docType: string;
  rejectionReason: string;
  uploadUrl: string;
};

export function DocumentRejectedEmail({
  customerName,
  docType,
  rejectionReason,
  uploadUrl,
}: DocumentRejectedEmailProps) {
  return (
    <BaseEmail preview="A document needs your attention." title="Document needs attention">
      <Text style={text}>Hi {customerName},</Text>
      <Text style={text}>Your {docType.replaceAll("_", " ")} could not be approved yet.</Text>
      <Text style={text}>Reason: {rejectionReason}</Text>
      <Section style={buttonRow}>
        <Button href={uploadUrl} style={button}>
          Upload a replacement
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
