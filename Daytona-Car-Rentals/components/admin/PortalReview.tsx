"use client";
import { useEffect, useState } from "react";
import type { Reservation } from "@/lib/pilot/model";
import type { ownerPortal } from "@/lib/customer/portal";
import { directVehicles } from "@/lib/data/rentalChannels";
type Data = Awaited<ReturnType<typeof ownerPortal>>;
export function PortalReview({
  r,
  reload,
}: {
  r?: Reservation;
  reload: () => Promise<void>;
}) {
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    const res = await fetch("/api/admin/portal");
    const d = await res.json();
    if (res.ok) setData(d);
    else setError(d.error);
  }
  useEffect(() => {
    load().catch(() => setError("Unable to load renter review."));
  }, [r?.id, r?.revision]);
  async function save(payload: unknown, path = "/api/admin/portal") {
    setBusy(true);
    setError("");
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }
  const intake = data?.intakes.find((i) => i.request_id === r?.id)?.data;
  return (
    <section className="panel portal-tools">
      <h2>Renter intake and delivery queue</h2>
      <p>
        Email verification, contact completion, document review, driving-record
        checks and final approval are separate. No Stripe or screening provider
        is connected.
      </p>
      {error && <p role="alert">{error}</p>}
      {r && (
        <>
          <p>
            Reference {r.id} ·{" "}
            {r.customerId
              ? "Email account associated"
              : "Guest — no account association"}{" "}
            · {r.reviewStage || "Legacy manual review"}
          </p>
          {intake ? (
            <dl>
              {Object.entries(intake)
                .filter(([k]) => !["confirmedAt"].includes(k))
                .map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{String(v)}</dd>
                  </div>
                ))}
            </dl>
          ) : (
            <p>No renter intake submitted.</p>
          )}
          {data?.documents
            .filter((d) => d.request_id === r.id)
            .map((d) => (
              <p key={d.id}>
                <a
                  className="text-link"
                  href={"/api/customer/documents?owner=true&id=" + d.id}
                >
                  {d.kind} · {d.reviewed ? "Reviewed" : "Needs review"}
                </a>
              </p>
            ))}
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
                  vehicleId: f.get("vehicleId"),
                });
              }}
            >
              <label>
                Review action
                <select name="action">
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
              </label>
              <label>
                Alternative car
                <select name="vehicleId">
                  {directVehicles
                    .filter((v) => v.id !== r.quote.vehicleId)
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.year} {v.make} {v.model}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Reason / instructions visible to customer
                <textarea
                  name="reason"
                  minLength={5}
                  maxLength={500}
                  required
                />
              </label>
              <button className="journey-primary" disabled={busy}>
                Record review decision
              </button>
            </form>
          )}
          <a className="text-link" href={"/api/admin/portal?agreement=" + r.id}>
            Export reviewed agreement-field mapping
          </a>
        </>
      )}
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
          Preview captures messages; captured is not sent. Each row is a durable
          event. Blocked or uncertain delivery requires operator reconciliation.
        </p>
        {data?.notifications.map((n) => (
          <details key={n.id}>
            <summary>
              {n.event_key} · {n.state} · attempts {n.attempts}
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
    </section>
  );
}
