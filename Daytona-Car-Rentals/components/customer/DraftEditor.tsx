"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { DraftData, loadDraft } from "@/lib/customer/drafts";
import type { TripInput } from "@/lib/pilot/model";
import { IntakeFields } from "./IntakeFields";
import { intakeSchema } from "@/lib/customer/intake";
import { requestSchema } from "@/lib/pilot/model";
import { DocumentUpload } from "./DocumentUpload";
export type DraftView = Awaited<ReturnType<typeof loadDraft>>;
export function DraftEditor({
  user,
  trip,
  active,
  demo,
  onSaved,
  onReady,
  onAuthLost,
}: {
  user: { id: string; email: string };
  trip: TripInput;
  active: boolean;
  demo: boolean;
  onSaved: (d: DraftView | null) => void;
  onReady: () => void;
  onAuthLost: () => void;
}) {
  const [draft, setDraft] = useState<DraftView | null>(null),
    [values, setValues] = useState<DraftData | null>(null),
    [saved, setSaved] = useState<any[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState("");
  const current = useRef<DraftView | null>(null),
    latest = useRef<DraftData | null>(null),
    tripRef = useRef(trip),
    queue = useRef(Promise.resolve()),
    alive = useRef(true),
    newId = useRef("");
  tripRef.current = trip;
  function receive(d: DraftView) {
    current.current = d;
    if (alive.current) {
      setDraft(d);
      onSaved(d);
    }
  }
  async function post(body: Record<string, unknown>) {
    const r = await fetch("/api/customer/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, expectedOwner: user.id }),
    });
    const d = await r.json();
    if (r.status === 401) {
      onAuthLost();
      throw Error("Sign in again to resume this private draft.");
    }
    if (!r.ok) throw Error(d.error);
    return d as DraftView;
  }
  function save() {
    const task = queue.current
      .catch(() => {})
      .then(async () => {
        if (!latest.current || !alive.current) return;
        setBusy(true);
        setError("");
        try {
          const d = await post({
            action: "save",
            id: current.current?.id || newId.current,
            revision: current.current?.revision || 0,
            data: { ...latest.current, trip: tripRef.current },
          });
          receive(d);
          setStatus("Draft saved privately. No request submitted.");
          return d;
        } catch (e) {
          setError(e instanceof Error ? e.message : "Unable to save.");
          throw e;
        } finally {
          if (alive.current) setBusy(false);
        }
      });
    queue.current = task.then(() => {}).catch(() => {});
    return task;
  }
  useEffect(() => {
    alive.current = true;
    let cancelled = false;
    (async () => {
      setBusy(true);
      try {
        const p = new URLSearchParams(window.location.search),
          id = p.get("draft");
        newId.current = id || crypto.randomUUID();
        const r = await fetch(
            "/api/customer/drafts" +
              (id ? "?id=" + encodeURIComponent(id) : ""),
            { cache: "no-store" },
          ),
          d = await r.json();
        if (!r.ok) throw Error(d.error);
        if (cancelled) return;
        let data: DraftData;
        if (id) {
          if (d.request_id)
            throw Error(
              "This draft has been submitted. Open My trips for status and corrections.",
            );
          receive(d);
          data = d.data;
        } else {
          data = {
            trip: { ...tripRef.current, period: tripRef.current.period || "" },
            contact: d.saved.contact,
            intake: d.saved.intake,
          };
          setSaved(d.saved.documents);
          const url = new URL(window.location.href);
          url.searchParams.set("draft", newId.current);
          window.history.replaceState(null, "", url);
        }
        latest.current = data;
        setValues(data);
        if (id) {
          const rr = await fetch("/api/customer/drafts", { cache: "no-store" });
          if (rr.ok && !cancelled) setSaved((await rr.json()).saved.documents);
        }
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Unable to load draft.");
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
      alive.current = false;
    };
    // Ownership changes remount this component; no browser-persisted identity details.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!values) return;
    const timer = setTimeout(() => {
      void save().catch(() => {});
    }, 600);
    return () => clearTimeout(timer);
  }, [values, trip]);
  function change(v: DraftData) {
    latest.current = v;
    setValues(v);
    onSaved(null);
    setStatus("Saving changes…");
  }
  if (!values)
    return (
      <div hidden={!active}>
        <p role="status">{busy ? "Loading your private draft…" : ""}</p>
        {error && <p role="alert">{error}</p>}
        <Link href="/my-trip">Open your saved drafts</Link>
      </div>
    );
  return (
    <section aria-label="Private driver draft" hidden={!active}>
      <p>
        Save your information and documents here before requesting the car.
        Nothing is reserved until our team approves and confirms your rental.
      </p>
      {demo && (
        <p className="demo-banner">
          Synthetic information and sample document images only. Never upload
          real identity documents in Preview.
        </p>
      )}
      <fieldset disabled={busy}>
        <legend>Contact details</legend>
        <div className="form-grid">
          <label>
            Full name
            <input
              autoComplete="name"
              value={values.contact.name}
              onChange={(e) =>
                change({
                  ...values,
                  contact: { ...values.contact, name: e.target.value },
                })
              }
            />
          </label>
          <label>
            Email
            <input type="email" readOnly value={user.email} />
          </label>
          <label>
            Phone
            <input
              type="tel"
              autoComplete="tel"
              value={values.contact.phone}
              onChange={(e) =>
                change({
                  ...values,
                  contact: { ...values.contact, phone: e.target.value },
                })
              }
            />
          </label>
        </div>
        <IntakeFields
          value={values.intake}
          onChange={(intake) =>
            change({
              ...values,
              intake: { ...intake, confirmed: !!intake.confirmed },
            })
          }
        />
      </fieldset>
      <h3>Private documents</h3>
      <p>
        Upload your driver’s license and insurance document when required by
        your quote. Uploaded does not mean reviewed or approved. An insurance
        card alone does not establish rental coverage.
      </p>
      <p className="small-note">
        Drafts expire 30 days after creation. Submitted copies and their
        original versions expire 30 days after return. Deletion from active
        storage does not erase retained backups. No documents are emailed.{" "}
        <Link href="/privacy">Privacy information</Link>
      </p>
      {draft?.documents.map((doc) => (
        <div key={doc.id} className="date-actions">
          <a
            className="text-link"
            href={"/api/customer/drafts?document=" + doc.id}
          >
            {doc.kind} · Uploaded — awaiting owner review · valid through{" "}
            {doc.valid_until}
          </a>
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                receive(
                  await post({
                    action: "remove",
                    id: draft.id,
                    kind: doc.kind,
                  }),
                );
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Remove {doc.kind}
          </button>
        </div>
      ))}
      {saved.length > 0 && (
        <details>
          <summary>Reuse a saved document</summary>
          <p>
            Choose a current document explicitly. Each new request requires a
            fresh owner review.
          </p>
          {saved.map((doc) => (
            <button
              className="text-link"
              disabled={busy}
              key={doc.id}
              onClick={async () => {
                try {
                  const d = await save();
                  if (!d) return;
                  setBusy(true);
                  receive(
                    await post({
                      action: "reuse",
                      id: d.id,
                      revision: d.revision,
                      source: doc.id,
                    }),
                  );
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Reuse {doc.kind} valid through {doc.valid_until} ·{" "}
              {doc.reviewed ? "Previously reviewed" : "Uploaded, not reviewed"}
            </button>
          ))}
        </details>
      )}
      <DocumentUpload
        endpoint="/api/customer/drafts"
        payload={{
          action: "upload",
          id: draft?.id,
          revision: draft?.revision,
          expectedOwner: user.id,
        }}
        disabled={busy || !draft || status === "Saving changes…"}
        demo={demo}
        onBusy={setBusy}
        done={receive}
      />
      <p role="status">{status}</p>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button
          className="journey-secondary"
          disabled={busy}
          onClick={async () => {
            if (await save().catch(() => null))
              window.location.assign("/my-trip");
          }}
        >
          Save and finish later
        </button>
        <button
          className="journey-primary"
          disabled={busy}
          onClick={async () => {
            const d = await save().catch(() => null);
            if (!d) return;
            if (
              !requestSchema
                .pick({ name: true, phone: true })
                .safeParse(d.data.contact).success
            ) {
              setError(
                "Enter your full name and a valid phone number before review.",
              );
              return;
            }
            if (!intakeSchema.safeParse(d.data.intake).success) {
              setError(
                "Complete all renter fields and confirm they are accurate before review. Your draft is saved.",
              );
              return;
            }
            onReady();
          }}
        >
          Continue to review
        </button>
      </div>
    </section>
  );
}
