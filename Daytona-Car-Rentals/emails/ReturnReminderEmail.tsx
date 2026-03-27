import { Text } from "@react-email/components";

import { BaseEmail } from "@/emails/BaseEmail";

type ReturnReminderEmailProps = {
  customerName: string;
  vehicleDescription: string;
  returnLocation: string;
  returnDate: string;
};

export function ReturnReminderEmail({
  customerName,
  vehicleDescription,
  returnLocation,
  returnDate,
}: ReturnReminderEmailProps) {
  return (
    <BaseEmail preview="Your rental return is tomorrow." title="Your rental return is tomorrow">
      <Text style={text}>Hi {customerName},</Text>
      <Text style={text}>Your {vehicleDescription} is scheduled for return on {returnDate}.</Text>
      <Text style={text}>Return location: {returnLocation}</Text>
      <Text style={text}>If your plans have changed, reach out before return time so we can help.</Text>
    </BaseEmail>
  );
}

const text = {
  color: "#334155",
  fontSize: "16px",
  lineHeight: "26px",
};
