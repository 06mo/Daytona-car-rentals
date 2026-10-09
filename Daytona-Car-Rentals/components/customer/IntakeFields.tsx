"use client";
export type IntakeValues = {
  legalName?: string;
  birthDate?: string;
  licenseRegion?: string;
  licenseExpiry?: string;
  address?: string;
  confirmed?: boolean;
};
export function IntakeFields({
  value,
  onChange,
}: {
  value: IntakeValues;
  onChange: (v: IntakeValues) => void;
}) {
  return (
    <>
      <p>
        Enter these fields yourself and confirm they are accurate. No OCR or
        identity verification is performed. Do not enter Social Security or
        payment details.
      </p>
      <div className="form-grid">
        {[
          ["legalName", "Legal name", "text"],
          ["birthDate", "Date of birth", "date"],
          ["licenseRegion", "License issuing state / country", "text"],
          ["licenseExpiry", "License expiration", "date"],
          ["address", "Residential address for agreement", "text"],
        ].map(([name, label, type]) => (
          <label key={name}>
            {label}
            <input
              name={name}
              type={type}
              value={String(value[name as keyof IntakeValues] || "")}
              maxLength={name === "address" ? 300 : 100}
              onChange={(e) =>
                onChange({ ...value, [name]: e.target.value, confirmed: false })
              }
            />
          </label>
        ))}
      </div>
      <label className="checkbox-row">
        <input
          type="checkbox"
          name="confirmed"
          checked={!!value.confirmed}
          onChange={(e) => onChange({ ...value, confirmed: e.target.checked })}
        />
        I confirm these fields are accurate. They remain subject to owner
        review.
      </label>
    </>
  );
}
export function IntakeSummary({ value }: { value: IntakeValues }) {
  return (
    <dl className="price-summary">
      {[
        ["Legal name", value.legalName],
        ["Date of birth", value.birthDate],
        ["License issuing state / country", value.licenseRegion],
        ["License expiration", value.licenseExpiry],
        ["Residential address", value.address],
      ].map(([label, v]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{v || "Not provided"}</dd>
        </div>
      ))}
    </dl>
  );
}
