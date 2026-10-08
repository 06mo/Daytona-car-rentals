import { z } from "zod";
// Null means inherit. Monetary values are integer cents; no implied discounts.
export const policySchema = z
  .object({
    dailyCents: z.number().int().min(0).max(500000).nullable().optional(),
    weeklyCents: z.number().int().min(0).max(3500000).nullable().optional(),
    monthlyCents: z.number().int().min(0).max(15000000).nullable().optional(),
    depositCents: z.number().int().min(0).max(500000).nullable().optional(),
    mileagePerDay: z.number().int().min(0).max(5000).nullable().optional(),
    excessMileCents: z.number().int().min(0).max(10000).nullable().optional(),
    minimumAge: z.number().int().min(18).max(99).nullable().optional(),
    maximumAge: z.number().int().min(18).max(99).nullable().optional(),
    minDays: z.number().int().min(1).max(30).nullable().optional(),
    maxDays: z.number().int().min(1).max(30).nullable().optional(),
    pickupCents: z.number().int().min(0).max(50000).nullable().optional(),
    deliveryCents: z.number().int().min(0).max(50000).nullable().optional(),
    bufferMinutes: z.number().int().min(0).max(1440).nullable().optional(),
    requiredDocuments: z
      .array(z.enum(["license", "insurance"]))
      .min(1)
      .max(2)
      .optional(),
    operationalTerms: z.string().trim().max(2000).optional(),
  })
  .strict();
export type RentalPolicy = z.infer<typeof policySchema>;
export function resolvePolicy(
  global: RentalPolicy = {},
  local: RentalPolicy = {},
): RentalPolicy {
  const p = {
    ...Object.fromEntries(Object.entries(global).filter(([, v]) => v !== null)),
    ...Object.fromEntries(Object.entries(local).filter(([, v]) => v !== null)),
  } as RentalPolicy;
  if (
    (p.minDays || 1) > (p.maxDays || 30) ||
    (p.minimumAge || 18) > (p.maximumAge || 99)
  )
    throw new Error("Minimum must not exceed maximum.");
  return p;
}
