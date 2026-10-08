import type { RentalPolicy } from "@/lib/pilot/policy";
const fields = [
  ["dailyCents", "Daily price (cents)"],
  ["weeklyCents", "Seven-day block price (cents)"],
  ["monthlyCents", "30-day term price (cents)"],
  ["depositCents", "Deposit (cents)"],
  ["mileagePerDay", "Mileage allowance per day"],
  ["excessMileCents", "Excess mileage (cents / mile)"],
  ["minimumAge", "Minimum age"],
  ["maximumAge", "Maximum age"],
  ["minDays", "Minimum days"],
  ["maxDays", "Maximum days (never over 30)"],
  ["pickupCents", "Local pickup fee (cents)"],
  ["deliveryCents", "Airport delivery fee (cents)"],
  ["bufferMinutes", "Turnaround buffer (minutes)"],
] as const;
export function readPolicy(f: FormData): RentalPolicy {
  const p: Record<string, unknown> = {};
  for (const [k] of fields) {
    const v = f.get("policy:" + k);
    if (typeof v === "string" && v !== "") p[k] = Number(v);
  }
  const terms = f.get("policy:operationalTerms");
  if (terms) p.operationalTerms = String(terms);
  const docs = f.getAll("policy:requiredDocuments");
  if (docs.length) p.requiredDocuments = docs;
  return p as RentalPolicy;
}
export function PolicyFields({ policy = {} }: { policy?: RentalPolicy }) {
  return (
    <details className="portal-tools">
      <summary>Pricing and rental-policy overrides</summary>
      <p>
        Blank fields inherit global policy, then existing rate/settings. A
        weekly price applies to each complete seven-day block, with remaining
        days at the daily price. Monthly price applies only to a 30-day term.
        These values do not establish legal or insurer requirements. Sample
        values require business approval.
      </p>
      <div className="policy-grid">
        {fields.map(([k, label]) => (
          <label key={k}>
            {label}
            <input
              name={"policy:" + k}
              type="number"
              min={["minDays", "maxDays"].includes(k) ? 1 : 0}
              max={k === "maxDays" || k === "minDays" ? 30 : undefined}
              step="1"
              defaultValue={policy[k] ?? ""}
            />
          </label>
        ))}
      </div>
      <label>
        Operational terms (no invented legal coverage)
        <textarea
          name="policy:operationalTerms"
          maxLength={2000}
          defaultValue={policy.operationalTerms || ""}
        />
      </label>
      <p>Required documents (blank inherits; default license and insurance)</p>
      {["license", "insurance"].map((k) => (
        <label className="checkbox-row" key={k}>
          <input
            name="policy:requiredDocuments"
            type="checkbox"
            value={k}
            defaultChecked={policy.requiredDocuments?.includes(
              k as "license" | "insurance",
            )}
          />
          {k}
        </label>
      ))}
    </details>
  );
}
