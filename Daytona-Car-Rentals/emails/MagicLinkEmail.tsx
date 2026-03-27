import { Button, Text } from "@react-email/components";

import { BaseEmail } from "@/emails/BaseEmail";

export function MagicLinkEmail({
  expiresInMinutes = 60,
  magicLink,
}: {
  expiresInMinutes?: number;
  magicLink: string;
}) {
  return (
    <BaseEmail preview="Your secure Daytona Car Rentals sign-in link is ready." title="Sign in to Daytona Car Rentals">
      <Text style={copy}>
        Click the secure link below to sign in and continue your booking. This link expires in {expiresInMinutes} minutes.
      </Text>
      <Button href={magicLink} style={button}>
        Sign In Securely
      </Button>
      <Text style={copy}>If you didn&apos;t request this sign-in link, you can safely ignore this email.</Text>
    </BaseEmail>
  );
}

const copy = {
  color: "#334155",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 20px",
};

const button = {
  backgroundColor: "#f97316",
  borderRadius: "999px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "15px",
  fontWeight: "700",
  marginBottom: "20px",
  padding: "14px 22px",
  textDecoration: "none",
};
