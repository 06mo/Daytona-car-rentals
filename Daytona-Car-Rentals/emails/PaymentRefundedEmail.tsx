import { Text } from "@react-email/components";

import { BaseEmail } from "@/emails/BaseEmail";

type PaymentRefundedEmailProps = {
  customerName: string;
  refundAmount: string;
  last4?: string;
};

export function PaymentRefundedEmail({ customerName, refundAmount, last4 }: PaymentRefundedEmailProps) {
  return (
    <BaseEmail preview="Your refund is on its way." title="Refund on its way">
      <Text style={text}>Hi {customerName},</Text>
      <Text style={text}>We&apos;ve processed your refund for {refundAmount}.</Text>
      {last4 ? <Text style={text}>The refund will return to the card ending in {last4}.</Text> : null}
      <Text style={text}>Most banks post refunds within 5 to 10 business days.</Text>
    </BaseEmail>
  );
}

const text = {
  color: "#334155",
  fontSize: "16px",
  lineHeight: "26px",
};
