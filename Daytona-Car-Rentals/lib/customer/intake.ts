import { z } from "zod";

// Shared validation for the existing portal and the pre-request draft editor.
export const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = new Date(s + "T12:00:00Z");
    return !isNaN(+d) && d.toISOString().slice(0, 10) === s;
  }, "Enter a valid date.");
export const intakeSchema = z.object({
  legalName: z.string().trim().min(2).max(100),
  birthDate: date,
  licenseRegion: z.string().trim().min(2).max(80),
  licenseExpiry: date,
  address: z.string().trim().min(8).max(300),
  confirmed: z.literal(true),
});
