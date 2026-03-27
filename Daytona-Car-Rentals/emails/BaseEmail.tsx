import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

type BaseEmailProps = {
  children: ReactNode;
  preview: string;
  title: string;
  unsubscribeUrl?: string;
};

export function BaseEmail({
  children,
  preview,
  title,
  unsubscribeUrl = "https://daytonacarrentals.com/unsubscribe",
}: BaseEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={eyebrow}>Daytona Car Rentals</Text>
            <Text style={titleStyle}>{title}</Text>
          </Section>

          <Section style={content}>{children}</Section>

          <Hr style={divider} />

          <Section style={footer}>
            <Text style={footerText}>Daytona Car Rentals, 700 S Atlantic Ave, Daytona Beach, FL 32118</Text>
            <Button href={unsubscribeUrl} style={unsubscribeButton}>
              Manage email preferences
            </Button>
            <Text style={legalText}>
              You are receiving this email because you created an account or booking with Daytona Car Rentals.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body = {
  backgroundColor: "#f8fafc",
  fontFamily: "Arial, sans-serif",
  margin: 0,
  padding: "24px 0",
};

const container = {
  backgroundColor: "#ffffff",
  borderRadius: "24px",
  margin: "0 auto",
  maxWidth: "640px",
  overflow: "hidden",
};

const header = {
  background: "linear-gradient(135deg, #f97316, #fb923c)",
  padding: "32px 40px 24px",
};

const eyebrow = {
  color: "#ffedd5",
  fontSize: "12px",
  fontWeight: "700",
  letterSpacing: "0.24em",
  margin: "0 0 12px",
  textTransform: "uppercase" as const,
};

const titleStyle = {
  color: "#ffffff",
  fontSize: "28px",
  fontWeight: "700",
  lineHeight: "36px",
  margin: 0,
};

const content = {
  padding: "32px 40px 16px",
};

const divider = {
  borderColor: "#e2e8f0",
  margin: "0 40px",
};

const footer = {
  padding: "24px 40px 32px",
};

const footerText = {
  color: "#64748b",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "0 0 16px",
};

const unsubscribeButton = {
  backgroundColor: "#fff7ed",
  borderRadius: "999px",
  color: "#c2410c",
  fontSize: "13px",
  fontWeight: "600",
  marginBottom: "16px",
  padding: "10px 18px",
  textDecoration: "none",
};

const legalText = {
  color: "#94a3b8",
  fontSize: "12px",
  lineHeight: "18px",
  margin: 0,
};
