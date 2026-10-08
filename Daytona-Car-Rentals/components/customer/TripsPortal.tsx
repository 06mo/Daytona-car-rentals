"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { SignIn } from "./SignIn";
import { vehicles } from "@/lib/data/vehicles";
import { PriceSummary } from "@/components/booking/BookingWizard";
import type { trips } from "@/lib/customer/portal";
type Trip = Awaited<ReturnType<typeof trips>>[number];
export function TripsPortal() {
  const [items, setItems] = useState<Trip[]>([]),
    [signed, setSigned] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true);
  async function load() {
    try {
      const r = await fetch("/api/customer/trips", { cache: "no-store" });
      const d = await r.json();
      if (r.status === 401) {
        setSigned(false);
        return;
      }
      if (!r.ok) throw Error(d.error);
      setSigned(true);
      setItems(d.trips);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load trips.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function action(
    payload: unknown,
    endpoint = "/api/customer/trips",
    method = "POST",
  ) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      await load();
      if (d.message) setError(d.message);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="container page-section portal">
      <p className="eyebrow">YOUR RENTAL REQUESTS</p>
      <h1>My trips</h1>
      <p>
        Email sign-in protects your information. Each rental requires separate
        driver review and approval.
      </p>
      {loading ? (
        <p role="status">Loading trips…</p>
      ) : !signed ? (
        <SignIn />
      ) : (
        <>
          <button
            className="text-link"
            onClick={async () => {
              if (await action({}, "/api/customer/auth", "DELETE")) {
                try {
                  sessionStorage.removeItem("dcr-contact-draft");
                } catch {}
                setItems([]);
                setSigned(false);
              }
            }}
          >
            Sign out
          </button>
          <button className="text-link" onClick={load}>
            Refresh trips
          </button>
          {!items.length && (
            <p>
              No requests are associated with your account.{" "}
              <Link href="/fleet">Browse cars</Link>.
            </p>
          )}
          {items.map((t,index) => (
            <TripCard
              key={t.id + ":" + t.revision}
              trip={t}
              initialOpen={index===0}
              busy={busy}
              action={action}
            />
          ))}
          <details className="panel">
            <summary>Find an earlier guest request</summary>
            <p>
              Enter its reference. We only consider claims matching your
              verified email; the owner must review and approve the association
              before any information is shown.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                action({
                  action: "claim",
                  id: new FormData(e.currentTarget).get("reference"),
                });
              }}
            >
              <label>
                Request reference
                <input name="reference" required maxLength={36} />
              </label>
              <button className="journey-primary" disabled={busy}>
                Request association review
              </button>
            </form>
          </details>
        </>
      )}
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
    </section>
  );
}
function TripCard({
  trip: t,
  initialOpen,
  busy,
  action,
}: {
  trip: Trip;
  initialOpen: boolean;
  busy: boolean;
  action: (p: unknown, endpoint?: string, method?: string) => Promise<unknown>;
}) {
  const car = vehicles.find((v) => v.id === t.quote.vehicleId);
  const editable = !["Confirmed", "Declined", "Cancelled", "Expired"].includes(
    t.status.label,
  );
  return (
    <article className="panel trip-card">
      <p className="eyebrow">
        {t.demo ? "SYNTHETIC PREVIEW REQUEST" : "DIRECT REQUEST"}
      </p>
      <h2>
        {car?.year} {car?.make} {car?.model}
      </h2>
      <p className="reference">Reference {t.id}</p>
      <p>
        {t.quote.start.replace("T", " ")} — {t.quote.end.replace("T", " ")}{" "}
        Eastern · {t.quote.period || "Custom dates"} ·{" "}
        {t.quote.location === "airport" ? "Airport delivery" : "Local pickup"}
      </p>
      <h3>{t.status.label}</h3>
      <p>{t.status.next}</p>
      <details>
        <summary>Trip price snapshot</summary>
        <PriceSummary quote={t.quote} />
      </details>
      {t.alternative && t.stage === "alternative" && (
        <section className="notice">
          <div>
            <h3>Alternative for your acceptance</h3>
            <p>
              {vehicles.find((v) => v.id === t.alternative?.vehicleId)?.make}{" "}
              {vehicles.find((v) => v.id === t.alternative?.vehicleId)?.model}
            </p>
            <PriceSummary quote={t.alternative} />
            <p>
              Your original car is unchanged until you explicitly accept.
              Availability and offer expiry are checked again on acceptance.
            </p>
            <button
              disabled={busy || !editable}
              className="journey-primary"
              onClick={() => {
                if (
                  confirm(
                    "Accept this alternative vehicle and its displayed quote?",
                  )
                )
                  action({
                    action: "alternative",
                    id: t.id,
                    revision: t.revision,
                  });
              }}
            >
              Accept this alternative and price
            </button>
          </div>
        </section>
      )}
      {editable && (
        <details open={!t.intake && initialOpen}>
          <summary>Renter information</summary>
          <p>
            For eligibility review and agreement preparation. Do not enter a
            Social Security number or payment details. No automated identity or
            driving-record check is performed.
          </p>
          {t.demo && (
            <p className="demo-banner">
              Synthetic information and sample document images only. Never
              upload a real license or insurance card in Preview.
            </p>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              action({
                action: "intake",
                id: t.id,
                intake: {
                  legalName: f.get("legalName"),
                  birthDate: f.get("birthDate"),
                  licenseRegion: f.get("licenseRegion"),
                  licenseExpiry: f.get("licenseExpiry"),
                  address: f.get("address"),
                  confirmed: f.get("confirmed") === "on",
                },
              });
            }}
          >
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
                    defaultValue={t.intake?.[name] || ""}
                    required
                    maxLength={name === "address" ? 300 : 100}
                  />
                </label>
              ))}
            </div>
            <label className="checkbox-row">
              <input type="checkbox" name="confirmed" required />I confirm these
              fields are accurate. They remain subject to owner review.
            </label>
            <button className="journey-primary" disabled={busy}>
              Save renter information
            </button>
          </form>
        </details>
      )}
      <details>
        <summary>Private documents · {t.documents.length} submitted</summary>
        <p>
          JPEG or PNG, up to 2 MB and 16 megapixels. Images are stripped of
          metadata. Access is authenticated and audited. Documents expire 30
          days after the requested return; expired images cannot be downloaded
          and are removed by the retention job. You may delete them sooner;
          required review will become incomplete. No OCR is configured.
        </p>
        {t.documents.map((d) => (
          <div key={d.id} className="date-actions">
            <a
              className="text-link"
              href={"/api/customer/documents?id=" + d.id}
            >
              {d.kind} · {d.reviewed ? "Owner reviewed" : "Awaiting review"}
            </a>
            <button
              disabled={busy}
              onClick={() => {
                if (
                  confirm(
                    "Delete this document? Required review may become incomplete.",
                  )
                )
                  action({ id: d.id }, "/api/customer/documents", "DELETE");
              }}
            >
              Delete
            </button>
          </div>
        ))}
        {editable && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget),
                file = f.get("file") as File;
              if (file.size > 2097152) {
                alert("Maximum file size is 2 MB.");
                return;
              }
              const bytes = new Uint8Array(await file.arrayBuffer());
              let raw = "";
              for (const b of bytes) raw += String.fromCharCode(b);
              await action(
                { id: t.id, kind: f.get("kind"), content: btoa(raw) },
                "/api/customer/documents",
              );
            }}
          >
            <label>
              Document type
              <select name="kind">
                <option value="license">Driver license</option>
                <option value="insurance">Insurance document</option>
              </select>
            </label>
            <label>
              Image
              <input
                type="file"
                name="file"
                accept="image/jpeg,image/png"
                required
              />
            </label>
            <label className="checkbox-row">
              <input type="checkbox" required />
              {t.demo
                ? "This is a synthetic test image, not a real identity document."
                : "I understand the private document retention policy above."}
            </label>
            <button className="journey-primary" disabled={busy}>
              Upload privately
            </button>
          </form>
        )}
      </details>
      {editable && (
        <button
          disabled={busy}
          className="journey-primary"
          onClick={() => action({ action: "submit", id: t.id })}
        >
          Send information for owner review
        </button>
      )}
    </article>
  );
}
