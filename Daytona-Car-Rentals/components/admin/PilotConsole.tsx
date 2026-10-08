"use client";
import { PortalReview } from "./PortalReview";
import { PolicyFields, readPolicy } from "./PolicyFields";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CarFront,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { Brand } from "@/components/Brand";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { vehicles } from "@/lib/data/vehicles";
import { isDirectRental } from "@/lib/data/rentalChannels";
import {
  checks,
  money,
  type FleetRate,
  type PilotSettings,
  type Reservation,
} from "@/lib/pilot/model";
import type { adminState } from "@/lib/pilot/store";
type State = Awaited<ReturnType<typeof adminState>>;
type Mutation = (payload: unknown) => Promise<void>;
const checkLabels = {
  license: "License and identity",
  mvr: "Standard driving record",
  insurance: "Renter insurance",
  agreement: "Signed approved agreement",
  payment: "Payment / deposit evidence",
  protection: "Trip protection activation",
  channel: "Turo calendar checked and blocked",
};
function RateRow({ rate, save }: { rate: FleetRate; save: Mutation }) {
  const v = vehicles.find((v) => v.id === rate.vehicleId)!;
  return (
    <form
      className="rate-row"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        save({
          action: "rate",
          policy: readPolicy(f),
          vehicleId: rate.vehicleId,
          dailyCents: Math.round(Number(f.get("daily")) * 100),
          enabled: f.get("enabled") === "on",
          revision: rate.revision,
        });
      }}
    >
      <div>
        <strong>
          {v.make} {v.model}
        </strong>
        <small>
          {v.year} · {v.color}
        </small>
      </div>
      <Input
        id={v.id + "-daily"}
        name="daily"
        label="Daily rate ($)"
        type="number"
        min="0"
        max="5000"
        step="0.01"
        defaultValue={rate.dailyCents / 100}
        required
      />
      <label className="checkbox-row">
        <input
          name="enabled"
          type="checkbox"
          disabled={!isDirectRental(v.id)}
          defaultChecked={isDirectRental(v.id) && rate.enabled}
        />
        {isDirectRental(v.id) ? "Enable direct requests" : "Turo-only"}
      </label>
      <PolicyFields policy={rate.policy} />
      <Button type="submit" variant="outline">
        Save rate
      </Button>
    </form>
  );
}
function SettingsForm({
  settings: s,
  save,
}: {
  settings: PilotSettings;
  save: Mutation;
}) {
  const fields = [
    {
      key: "taxBps",
      label: "Tax rate (%)",
      value: s.taxBps / 100,
      scale: 100,
      max: 20,
    },
    {
      key: "surchargeCents",
      label: "Rental surcharge / day ($)",
      value: s.surchargeCents / 100,
      scale: 100,
      max: 100,
    },
    {
      key: "deliveryCents",
      label: "Airport delivery ($)",
      value: s.deliveryCents / 100,
      scale: 100,
      max: 500,
    },
    {
      key: "depositCents",
      label: "Security deposit ($)",
      value: s.depositCents / 100,
      scale: 100,
      max: 5000,
    },
    {
      key: "bufferMinutes",
      label: "Turnaround buffer (minutes)",
      value: s.bufferMinutes,
      scale: 1,
      max: 1440,
    },
    {
      key: "minimumAge",
      label: "Minimum renter age",
      value: s.minimumAge,
      scale: 1,
      max: 99,
    },
  ] as const;
  const flags = [
    {
      key: "policyApproved",
      label: "Actual direct-rental insurance policy reviewed",
    },
    { key: "agreementApproved", label: "Florida agreement approved for use" },
    { key: "taxApproved", label: "Taxes and taxable fees reviewed" },
    {
      key: "airportApproved",
      label: "DAB delivery permissions and procedures approved",
    },
    { key: "requestsEnabled", label: "Open direct booking requests" },
  ] as const;
  return (
    <form
      className="panel"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget),
          values = { ...s };
        for (const field of fields)
          values[field.key] = Math.round(
            Number(f.get(field.key)) * field.scale,
          );
        for (const flag of flags) values[flag.key] = f.get(flag.key) === "on";
        values.policyReference = String(f.get("policyReference"));
        values.agreementVersion = String(f.get("agreementVersion"));
        values.mileage = String(f.get("mileage"));
        save({
          action: "settings",
          settings: { ...values, policy: readPolicy(f) },
        });
      }}
    >
      <h2>Operating rules</h2>
      <p>
        Changes invalidate open quotes. Existing requests keep their accepted
        price snapshot.
      </p>
      <div className="form-grid">
        {fields.map((field) => (
          <Input
            key={field.key}
            id={field.key}
            name={field.key}
            label={field.label}
            type="number"
            min="0"
            max={field.max}
            step={field.scale === 100 ? "0.01" : "1"}
            defaultValue={field.value}
            required
          />
        ))}
        <Input
          id="mileage"
          name="mileage"
          label="Mileage policy"
          defaultValue={s.mileage}
          maxLength={200}
        />
        <Input
          id="policyReference"
          name="policyReference"
          label="Approved policy / broker reference"
          defaultValue={s.policyReference}
          maxLength={200}
        />
        <Input
          id="agreementVersion"
          name="agreementVersion"
          label="Approved agreement version"
          defaultValue={s.agreementVersion}
          maxLength={100}
        />
      </div>
      <PolicyFields policy={s.policy} />
      <h3>Launch approvals</h3>
      <p>
        Record the actual approvals first. These switches document your review;
        they don’t verify a policy or activate coverage.
      </p>
      {flags.map((flag) => (
        <label className="checkbox-row" key={flag.key}>
          <input type="checkbox" name={flag.key} defaultChecked={s[flag.key]} />
          {flag.label}
        </label>
      ))}
      <Button type="submit">Save settings</Button>
    </form>
  );
}
function ReviewPanel({ r, save }: { r: Reservation; save: Mutation }) {
  const v = vehicles.find((v) => v.id === r.quote.vehicleId)!;
  const expired = r.status === "pending" && r.holdUntil < Date.now();
  return (
    <div className="panel review-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            {r.id.slice(0, 8)} ·{" "}
            {r.demo ? "SYNTHETIC PREVIEW" : "DIRECT REQUEST"}
          </p>
          <h2>{r.name}</h2>
          <p>
            {v.make} {v.model} · {r.quote.start.replace("T", " ")} —{" "}
            {r.quote.end.replace("T", " ")} ET
          </p>
          <p>
            {r.email} · {r.phone}
          </p>
        </div>
        <span className="status-pill">
          {expired ? "Hold expired" : r.status}
        </span>
      </div>
      <p>
        Trip total {money(r.quote.totalCents)} · Deposit{" "}
        {money(r.quote.depositCents)} ·{" "}
        {r.quote.location === "airport" ? "DAB delivery" : "Local pickup"}
      </p>
      <p className="small-note">
        Hold until{" "}
        {new Date(r.holdUntil).toLocaleString("en-US", {
          timeZone: "America/New_York",
        })}{" "}
        ET. Record provider references, not raw license or policy numbers. Never
        claim a document was checked without doing the review.
      </p>
      {checks.map((check) => (
        <form
          key={check + ":" + r.revision}
          className="check-row"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            save({
              action: "review",
              id: r.id,
              revision: r.revision,
              check,
              checked: f.get("checked") === "on",
              evidence: String(f.get("evidence")),
            });
          }}
        >
          <label className="checkbox-row">
            <input
              type="checkbox"
              name="checked"
              defaultChecked={r.checks[check].checked}
              disabled={r.status !== "pending"}
            />
            {checkLabels[check]}
          </label>
          <Input
            id={r.id + check}
            name="evidence"
            label="Review evidence / provider reference"
            defaultValue={r.checks[check].evidence}
            maxLength={500}
            disabled={r.status !== "pending"}
          />
          <Button
            variant="outline"
            type="submit"
            disabled={r.status !== "pending"}
          >
            Record check
          </Button>
        </form>
      ))}
      {r.status === "pending" && (
        <div className="form-actions">
          <Button
            variant="outline"
            onClick={() => {
              if (
                window.confirm(
                  "Cancel this request and release its internal hold? This does not process a refund.",
                )
              )
                save({
                  action: "status",
                  id: r.id,
                  revision: r.revision,
                  status: "cancelled",
                });
            }}
          >
            Cancel request
          </Button>
          <Button
            disabled={expired || !checks.every((c) => r.checks[c].checked)}
            onClick={() => {
              if (
                window.confirm(
                  "Confirm after completing the real release checks and blocking the other booking channel?",
                )
              )
                save({
                  action: "status",
                  id: r.id,
                  revision: r.revision,
                  status: "confirmed",
                });
            }}
          >
            Confirm after review
          </Button>
        </div>
      )}
    </div>
  );
}
export function PilotConsole() {
  const [state, setState] = useState<State | null>(null),
    [auth, setAuth] = useState(false),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [tab, setTab] = useState("today"),
    [selected, setSelected] = useState("");
  async function load() {
    try {
      const res = await fetch("/api/admin/state"),
        data = await res.json();
      if (res.status === 401) {
        setAuth(false);
        setState(null);
      } else if (!res.ok) throw new Error(data.error);
      else {
        setState(data);
        setAuth(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load operations.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function save(payload: unknown) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
        data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setAuth(false);
          setState(null);
        }
        throw new Error(data.error);
      }
      setState(data);
      setMessage("Saved. The audit record has been updated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }
  const nav = [
    { id: "today", label: "Today", icon: LayoutDashboard },
    { id: "requests", label: "Reservations", icon: ClipboardCheck },
    { id: "rates", label: "Fleet & rates", icon: CarFront },
    { id: "calendar", label: "Calendar blocks", icon: CalendarDays },
    { id: "settings", label: "Settings", icon: Settings2 },
    { id: "audit", label: "Audit trail", icon: ShieldCheck },
  ];
  if (loading)
    return (
      <div className="container page-section" role="status">
        Loading operations…
      </div>
    );
  if (!auth)
    return (
      <div className="admin-login">
        <Link href="/">
          <Brand />
        </Link>
        <form
          className="panel"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const password = new FormData(e.currentTarget).get("password");
            try {
              const r = await fetch("/api/admin/session", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ password }),
                }),
                data = await r.json();
              if (!r.ok) throw new Error(data.error);
              await load();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Unable to sign in.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <p className="eyebrow">OWNER ACCESS</p>
          <h1>Your day, in one place.</h1>
          <p>
            Sign in to manage direct-rental requests, rates and calendar blocks.
          </p>
          <Input
            id="password"
            name="password"
            type="password"
            label="Admin password"
            autoComplete="current-password"
            required
          />
          {error && (
            <p role="alert" className="error-message">
              {error}
            </p>
          )}
          <Button type="submit" loading={busy}>
            Sign in
          </Button>
        </form>
        <Link className="text-link" href="/">
          Back to the website
        </Link>
      </div>
    );
  if (!state) return null;
  const pending = state.reservations.filter(
      (r) => r.status === "pending" && r.holdUntil > Date.now(),
    ),
    confirmed = state.reservations.filter((r) => r.status === "confirmed");
  const chosen = state.reservations.find((r) => r.id === selected);
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <Link href="/">
          <Brand light />
        </Link>
        <p>OPERATIONS</p>
        <nav aria-label="Admin navigation">
          {nav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              aria-current={tab === id ? "page" : undefined}
              className={tab === id ? "active" : ""}
              onClick={() => {
                setTab(id);
                setError("");
                setMessage("");
              }}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        <button
          className="signout"
          onClick={async () => {
            await fetch("/api/admin/session", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: "{}",
            });
            setAuth(false);
            setState(null);
          }}
        >
          <LogOut size={18} />
          Sign out
        </button>
        <Link href="/">View website</Link>
      </aside>
      <section className="admin-content">
        <div className="section-heading">
          <div>
            <p className="eyebrow">DAYTONA CAR RENTALS</p>
            <h1>{nav.find((n) => n.id === tab)?.label}</h1>
          </div>
          <Button variant="outline" onClick={load} disabled={busy}>
            Refresh
          </Button>
        </div>
        {state.demo && (
          <div className="demo-banner">
            Preview operations · Sample rates and synthetic requests. These
            actions do not activate insurance or charge a card.
          </div>
        )}
        {error && (
          <div role="alert" className="error-message">
            {error}
          </div>
        )}
        {message && (
          <div role="status" className="success-message">
            {message}
          </div>
        )}
        <fieldset disabled={busy} className="admin-fieldset">
          {tab === "today" && (
            <>
              <div className="metric-grid">
                <div>
                  <small>Needs review</small>
                  <strong>{pending.length}</strong>
                </div>
                <div>
                  <small>Confirmed direct trips</small>
                  <strong>{confirmed.length}</strong>
                </div>
                <div>
                  <small>External / maintenance blocks</small>
                  <strong>{state.blocks.length}</strong>
                </div>
              </div>
              <div className="notice">
                <CalendarDays />
                <span>
                  Shared fleet: check the actual Turo calendar and block the
                  vehicle there before confirmation. There is no automatic Turo
                  synchronization.
                </span>
              </div>
              <h2>Next to review</h2>
              {pending.length ? (
                pending.map((r) => (
                  <button
                    className="request-line"
                    key={r.id}
                    onClick={() => {
                      setSelected(r.id);
                      setTab("requests");
                    }}
                  >
                    <strong>{r.name}</strong>
                    <span>
                      {vehicles.find((v) => v.id === r.quote.vehicleId)?.model}
                    </span>
                    <span>{r.quote.start.replace("T", " ")} ET</span>
                    <span className="status-pill">
                      {checks.filter((c) => r.checks[c].checked).length}/7
                      checks
                    </span>
                  </button>
                ))
              ) : (
                <div className="panel empty-state">
                  <h3>A clear desk.</h3>
                  <p>
                    No active requests awaiting review. Submitted requests
                    appear here.
                  </p>
                </div>
              )}
            </>
          )}
          {tab === "requests" && (
            <>
              <div className="request-list">
                {state.reservations.map((r) => (
                  <button
                    className={selected === r.id ? "active" : ""}
                    key={r.id}
                    onClick={() => setSelected(r.id)}
                  >
                    {r.name} · {r.id.slice(0, 8)} · {r.status}
                  </button>
                ))}
              </div>
              {chosen ? (
                <>
                  <ReviewPanel r={chosen} save={save} />
                  <PortalReview r={chosen} reload={load} />
                </>
              ) : (
                <div className="panel empty-state">
                  Choose a request to review its readiness checklist.
                </div>
              )}
            </>
          )}
          {tab === "rates" && (
            <>
              <div className="notice">
                <CarFront />
                <span>
                  Only the five direct-eligible cars, explicitly enabled with a
                  positive rate, are offered for direct rental. Verify
                  eligibility and actual fleet details before enabling.
                </span>
              </div>
              <div className="panel">
                {state.rates.map((rate) => (
                  <RateRow
                    key={rate.vehicleId + ":" + rate.revision}
                    rate={rate}
                    save={save}
                  />
                ))}
              </div>
            </>
          )}
          {tab === "settings" && (
            <SettingsForm
              key={state.settings.revision}
              settings={state.settings}
              save={save}
            />
          )}
          {tab === "calendar" && (
            <>
              <form
                className="panel"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  save({
                    action: "block",
                    trip: {
                      vehicleId: f.get("vehicleId"),
                      start: f.get("start"),
                      end: f.get("end"),
                      location: "local",
                    },
                    reason: f.get("reason"),
                  });
                }}
              >
                <h2>Block shared inventory</h2>
                <p>
                  Record a Turo trip, maintenance or another unavailable period.
                  These entries block direct quotes, but do not update Turo.
                </p>
                <div className="form-grid">
                  <Select
                    id="block-car"
                    name="vehicleId"
                    label="Vehicle"
                    options={vehicles.map((v) => ({
                      value: v.id,
                      label: `${v.make} ${v.model} · ${v.color}`,
                    }))}
                  />
                  <Input
                    id="block-start"
                    name="start"
                    label="Starts (Eastern)"
                    type="datetime-local"
                    required
                  />
                  <Input
                    id="block-end"
                    name="end"
                    label="Ends (Eastern)"
                    type="datetime-local"
                    required
                  />
                  <Input
                    id="block-reason"
                    name="reason"
                    label="Reason / external trip reference"
                    minLength={5}
                    maxLength={200}
                    required
                  />
                </div>
                <Button type="submit">Add calendar block</Button>
              </form>
              <div className="panel">
                {state.blocks.length ? (
                  state.blocks.map((b) => (
                    <div className="request-line" key={b.id}>
                      <strong>
                        {vehicles.find((v) => v.id === b.vehicleId)?.model}
                      </strong>
                      <span>
                        {b.start.replace("T", " ")} — {b.end.replace("T", " ")}{" "}
                        ET
                      </span>
                      <span>{b.reason}</span>
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (
                            window.confirm(
                              "Remove this direct-calendar block? Check the external channel first.",
                            )
                          )
                            save({ action: "removeBlock", id: b.id });
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))
                ) : (
                  <p>No calendar blocks recorded.</p>
                )}
              </div>
            </>
          )}
          {tab === "audit" && (
            <div className="panel">
              <PortalReview reload={load} />
              <h2>Recorded actions</h2>
              {state.audit.length ? (
                state.audit.map((a, i) => (
                  <div className="audit-row" key={i}>
                    <time>
                      {new Date(Number(a.at)).toLocaleString("en-US", {
                        timeZone: "America/New_York",
                      })}{" "}
                      ET
                    </time>
                    <strong>{String(a.action)}</strong>
                    <span>
                      {String(a.reference)} ·{" "}
                      {String(
                        (a as { actor?: string }).actor || "legacy owner",
                      )}{" "}
                      ·{" "}
                      {String(
                        (a as { details?: { reason?: string } }).details
                          ?.reason || "",
                      )}
                    </span>
                  </div>
                ))
              ) : (
                <p>No actions recorded yet.</p>
              )}
            </div>
          )}
        </fieldset>
      </section>
    </div>
  );
}
