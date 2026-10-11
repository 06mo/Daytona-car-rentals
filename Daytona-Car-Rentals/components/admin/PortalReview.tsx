"use client";
import { useEffect, useState, type ReactNode } from "react";
import type { Reservation } from "@/lib/pilot/model";
import type { ownerPortal } from "@/lib/customer/portal";
import { directVehicles } from "@/lib/data/rentalChannels";
type Data = Awaited<ReturnType<typeof ownerPortal>>;
export function PortalReview({
  r,
  reload,
  children,
}: {
  r?: Reservation;
  reload: () => Promise<void>;
  children?: ReactNode;
}) {
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [action, setAction] = useState(""),
    [reason, setReason] = useState(""),
    [message, setMessage] = useState("");
  async function load() {
    const res = await fetch("/api/admin/portal");
    const d = await res.json();
    if (res.ok) {
      setData(d);
      setError("");
    } else setError(d.error);
  }
  useEffect(() => {
    load().catch(() => setError("Unable to load renter review."));
  }, [r?.id, r?.revision]);
  async function save(payload: unknown, path = "/api/admin/portal") {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) throw Error(d.error);
      await load();
      await reload();
      setAction("");
      setReason("");
      setMessage("Saved. Review information refreshed.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }
  const intake = data?.intakes.find((i) => i.request_id === r?.id)?.data;
  return (
    <section className="panel portal-tools">
      <h2>Renter details</h2>
      <p>
        Email verification, contact completion, document review, driving-record
        checks and final approval are separate. No Stripe or screening provider
        is connected.
      </p>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {!data && !error && (
        <p role="status">Loading renter details and documents…</p>
      )}
      {error && !data && (
        <button
          className="journey-secondary"
          onClick={() =>
            load().catch(() => setError("Unable to load renter review."))
          }
        >
          Retry loading
        </button>
      )}
      {r && (
        <>
          <p>
            Reference {r.id} ·{" "}
            {r.customerId
              ? "Email account associated"
              : "Guest — no account association"}{" "}
            · {r.reviewStage?.replaceAll("_", " ") || "Legacy manual review"}
          </p>
          <h3>Contact</h3>
          <dl className="owner-facts">
            <div>
              <dt>Name</dt>
              <dd>{r.name}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{r.email}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{r.phone}</dd>
            </div>
          </dl>
          <h3>Driver and agreement information</h3>
          {intake ? (
            <dl className="owner-facts">
              {[
                "legalName",
                "birthDate",
                "licenseRegion",
                "licenseExpiry",
                "address",
                "confirmed",
                "reviewed",
              ]
                .map((k) => [k, intake[k]] as const)
                .map(([k, v]) => (
                  <div key={k}>
                    <dt>
                      {{
                        legalName: "Legal name",
                        birthDate: "Date of birth",
                        licenseRegion: "License issuing region",
                        licenseExpiry: "License expiration",
                        address: "Agreement address",
                        confirmed: "Renter confirmed fields",
                        reviewed: "Owner reviewed fields",
                      }[k] || k}
                    </dt>
                    <dd>
                      {typeof v === "boolean"
                        ? v
                          ? "Yes"
                          : "Pending"
                        : String(v)}
                    </dd>
                  </div>
                ))}
            </dl>
          ) : (
            <p>
              {data
                ? "No renter intake submitted."
                : "Loading renter information…"}
            </p>
          )}
          <h2>Documents</h2>
          <p>
            Uploaded is not approved. Open each private document and review its
            contents and expiration before recording a decision.
          </p>
          <div className="owner-document-grid">
            {["license", "insurance"].map((kind) => {
              const d = data?.documents.find(
                (d) => d.request_id === r.id && d.kind === kind,
              );
              const retained = d && Number(d.expires_at) > Date.now();
              const required = (
                r.quote.policy?.requiredDocuments || ["license", "insurance"]
              ).includes(kind as "license" | "insurance");
              return (
                <article className="document-card" key={kind}>
                  <h3>
                    {kind === "license"
                      ? "Driver’s license"
                      : "Insurance document"}
                  </h3>
                  <p>
                    {required
                      ? "Required by this quote"
                      : "Not required by this quote"}
                  </p>
                  <p>
                    {!data
                      ? "Loading…"
                      : !d
                        ? "Missing"
                        : !retained
                          ? "Retention period ended"
                          : d.reviewed
                            ? "Reviewed by owner"
                            : "Uploaded — awaiting review"}
                  </p>
                  {d && (
                    <p>
                      Document expiration:{" "}
                      <time dateTime={String(d.valid_until || "").slice(0, 10)}>
                        {String(d.valid_until || "").slice(0, 10) ||
                          "Not recorded"}
                      </time>
                    </p>
                  )}
                  {retained && (
                    <a
                      className="journey-secondary"
                      href={"/api/customer/documents?owner=true&id=" + d.id}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View private document{" "}
                      <span className="sr-only">(opens a new tab)</span>
                    </a>
                  )}
                </article>
              );
            })}
          </div>
          <h2>Review decision</h2>
          <p>
            Document approval records your manual review. Eligibility approval
            is a separate decision; neither confirms the rental. An alternative
            requires the customer's explicit acceptance.
          </p>
          {r.decisionReason && (
            <p>
              <strong>Latest customer instructions:</strong> {r.decisionReason}
            </p>
          )}
          {r.status === "pending" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                save({
                  action: f.get("action"),
                  id: r.id,
                  revision: r.revision,
                  reason: f.get("reason"),
                  ...(action === "alternative"
                    ? { vehicleId: f.get("vehicleId") }
                    : {}),
                });
              }}
            >
              <label htmlFor="owner-review-action">Review action</label>
              <select
                name="action"
                id="owner-review-action"
                required
                value={action}
                onChange={(e) => setAction(e.target.value)}
              >
                <option value="">Choose a review action</option>
                <option value="documents">
                  Approve documents and confirmed fields after manual review
                </option>
                <option value="corrections">Request corrections</option>
                <option value="alternative">
                  Offer alternative (customer must accept)
                </option>
                <option value="approved">
                  Approve eligibility / action required
                </option>
                <option value="declined">
                  Decline request and release hold
                </option>
              </select>
              {action === "alternative" && (
                <>
                  <label htmlFor="owner-alternative-car">Alternative car</label>
                  <select name="vehicleId" id="owner-alternative-car">
                    {directVehicles
                      .filter((v) => v.id !== r.quote.vehicleId)
                      .map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.year} {v.make} {v.model}
                        </option>
                      ))}
                  </select>
                </>
              )}
              <label>
                Reason / instructions visible to customer
                <textarea
                  name="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  minLength={5}
                  maxLength={500}
                  required
                />
              </label>
              <p id="decision-help">
                Choose an action and enter at least five characters of
                customer-visible instructions. No approval is selected
                automatically.
              </p>
              <button
                className="journey-primary"
                aria-describedby="decision-help"
                disabled={busy || !data || !action || reason.trim().length < 5}
              >
                {busy ? "Saving decision…" : "Record review decision"}
              </button>
            </form>
          )}
          {r.status !== "pending" && (
            <p>
              This request is no longer pending. Review decisions cannot be
              changed.
            </p>
          )}
          <p className="small-note owner-agreement-export">
            <a
              className="text-link"
              href={"/api/admin/portal?agreement=" + r.id}
            >
              Export reviewed agreement-field mapping
            </a>
            <br />
            Requires reviewed intake, current documents and an eligible approved
            request. This is not a signed agreement.
          </p>
        </>
      )}
      {children}
      <details className="owner-operations">
        <summary>Other owner tools and captured notifications</summary>
        <details>
          <summary>Guest association claims</summary>
          {data?.claims.map((c) => (
            <form
              key={c.id}
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                save({
                  action: "claim",
                  id: c.id,
                  accept: f.get("decision") === "approve",
                  reason: f.get("reason"),
                });
              }}
            >
              <p>
                {c.request_id} · verified account {c.customer_id}
              </p>
              <p>
                Confirm the claimant is entitled to this request using your
                original records. A matching verified email alone does not
                complete this review.
              </p>
              <select name="decision">
                <option value="decline">Decline</option>
                <option value="approve">Associate after review</option>
              </select>
              <input
                name="reason"
                aria-label="Association review reason"
                minLength={5}
                maxLength={500}
                required
              />
              <button disabled={busy}>Record association decision</button>
            </form>
          ))}
        </details>
        <details>
          <summary>Notification delivery status</summary>
          <p>
            Preview captures messages; captured is not sent. Each row is a
            durable event. Blocked or uncertain delivery requires operator
            reconciliation.
          </p>
          {data?.notifications.map((n) => (
            <details key={n.id}>
              <summary>
                {n.event_key} ·{" "}
                {n.state === "sent"
                  ? "Provider accepted (delivery unverified)"
                  : n.state}{" "}
                · attempts {n.attempts}
              </summary>
              <pre className="captured-email">
                {n.payload?.subject}
                {"\n"}
                {n.payload?.text}
              </pre>
            </details>
          ))}
          <button
            disabled={busy}
            onClick={() => save({}, "/api/admin/notifications")}
          >
            Process up to five queued notifications
          </button>
        </details>
        <button disabled={busy} onClick={() => save({ action: "purge" })}>
          Delete documents past retention date
        </button>
      </details>
    </section>
  );
}
