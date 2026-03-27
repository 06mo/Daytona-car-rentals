import { Button, Section, Text } from "@react-email/components";

import { BaseEmail } from "@/emails/BaseEmail";

type DocumentSubmittedEmailProps = {
  customerName: string;
  docType: string;
  reviewUrl: string;
};

export function DocumentSubmittedEmail({ customerName, docType, reviewUrl }: DocumentSubmittedEmailProps) {
  return (
    <BaseEmail preview="A new document is ready for review." title={`New document for review: ${customerName}`}>
      <Text style={text}>{customerName} uploaded a new {docType.replaceAll("_", " ")} for verification.</Text>
      <Section style={buttonRow}>
        <Button href={reviewUrl} style={button}>
          Open verification queue
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
