"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IntakeFields, type IntakeValues } from "./IntakeFields";
import { DocumentUpload } from "./DocumentUpload";
import { SignIn } from "./SignIn";
import { vehicles } from "@/lib/data/vehicles";
import { PriceSummary } from "@/components/booking/BookingWizard";
import type { trips } from "@/lib/customer/portal";
type Trip = Awaited<ReturnType<typeof trips>>[number];
export function TripsPortal() {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [items, setItems] = useState<Trip[]>([]),
    [signed, setSigned] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true);
  const loadVersion = useRef(0);
  async function load() {
    const version = ++loadVersion.current;
    setLoading(true);
    setItems([]);
    setDrafts([]);
    setError("");
    try {
      const r = await fetch("/api/customer/trips", { cache: "no-store" });
      const d = await r.json();
      if (version !== loadVersion.current) return;
      if (r.status === 401) {
        setItems([]);
        setDrafts([]);
        setSigned(false);
        return;
      }
      if (!r.ok) throw Error(d.error);
      setSigned(true);
      setItems(d.trips);
      setDrafts(d.drafts);
    } catch (e) {
      if (version === loadVersion.current)
        setError(e instanceof Error ? e.message : "Unable to load trips.");
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    const refresh = () => {
      void load();
    };
    window.addEventListener("focus", refresh);
    return () => {
      loadVersion.current++;
      window.removeEventListener("focus", refresh);
    };
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
                setDrafts([]);
                setSigned(false);
              }
            }}
          >
            Sign out
          </button>
          <button className="text-link" onClick={load}>
            Refresh trips
          </button>
          {drafts.map((d) => (
            <article className="panel" key={d.id}>
              <h2>
                Saved draft ·{" "}
                {vehicles.find((v) => v.id === d.data.trip.vehicleId)?.model}
              </h2>
              <p>
                No request submitted and no car held. Expires{" "}
                {new Date(Number(d.expires_at)).toLocaleDateString()}.
              </p>
              <Link
                className="journey-primary"
                href={
                  "/booking?" +
                  new URLSearchParams({
                    draft: d.id,
                    step: "2",
                    vehicle: d.data.trip.vehicleId,
                    start: d.data.trip.start,
                    end: d.data.trip.end,
                    period: d.data.trip.period,
                    location: d.data.trip.location,
                  })
                }
              >
                Resume driver & documents
              </Link>
            </article>
          ))}
          {!items.length && (
            <p>
              No requests are associated with your account.{" "}
              <Link href="/fleet">Browse cars</Link>.
            </p>
          )}
          {items.map((t, index) => (
            <TripCard
              key={t.id + ":" + t.revision}
              trip={t}
              initialOpen={index === 0}
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
  const [intake, setIntake] = useState<IntakeValues>({
    ...t.intake,
    confirmed: false,
  });
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

              action({
                action: "intake",
                id: t.id,
                intake,
              });
            }}
          >
            <IntakeFields value={intake} onChange={setIntake} />
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
          and are removed by the retention job. You may delete the current copy
          sooner; required review will become incomplete. Original submitted
          draft versions remain until their retention deadline, and retained
          backups expire separately. No OCR is configured.
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
          <DocumentUpload
            endpoint="/api/customer/documents"
            payload={{ id: t.id }}
            demo={t.demo}
            disabled={busy}
            done={() => action({ action: "refresh" }, "/api/customer/trips")}
          />
        )}
      </details>
      {editable &&
        ["documents_needed", "corrections"].includes(
          t.stage || "documents_needed",
        ) && (
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
